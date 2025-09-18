"""Backup Google Drive content into iCloud Drive with timestamped folders."""

from __future__ import annotations

import argparse
import hashlib
import io
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Iterator, Optional, Tuple

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FOLDER_MIME = "application/vnd.google-apps.folder"
DEFAULT_TIMESTAMP_FORMAT = "%Y-%m-%d_%H%M%S"
DEFAULT_DESTINATION_ROOT = (
    Path("~/Library/Mobile Documents/com~apple~CloudDocs/DriveBackups").expanduser()
)
GOOGLE_EXPORT_MAP: Dict[str, Tuple[str, str]] = {
    "application/vnd.google-apps.document": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx",
    ),
    "application/vnd.google-apps.spreadsheet": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    "application/vnd.google-apps.presentation": (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pptx",
    ),
    "application/vnd.google-apps.drawing": ("image/png", ".png"),
    "application/vnd.google-apps.script": ("application/vnd.google-apps.script+json", ".json"),
}
MAX_HTTP_RETRIES = 5
HTTP_BACKOFF_SECONDS = 4
DEFAULT_CHUNK_SIZE_BYTES = 32 * 1024 * 1024  # 32 MiB keeps memory usage low but avoids many round trips.


def parse_args(argv: Optional[Iterable[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--credentials-file",
        default="credentials.json",
        help="Path to the OAuth client credentials downloaded from Google Cloud Console.",
    )
    parser.add_argument(
        "--token-file",
        default="token.json",
        help="Path to persist the OAuth access/refresh token.",
    )
    parser.add_argument(
        "--source-folder-id",
        default="root",
        help="Google Drive folder ID to sync. Use 'root' for My Drive root.",
    )
    parser.add_argument(
        "--destination-root",
        default=str(DEFAULT_DESTINATION_ROOT),
        help="Local directory where backups are stored (defaults to iCloud Drive).",
    )
    parser.add_argument(
        "--label",
        default=None,
        help="Optional slug appended to the timestamped folder name (e.g. 'full-drive').",
    )
    parser.add_argument(
        "--timestamp-format",
        default=DEFAULT_TIMESTAMP_FORMAT,
        help="strftime-compatible format used for the backup folder name.",
    )
    parser.add_argument(
        "--chunk-size-mb",
        type=int,
        default=DEFAULT_CHUNK_SIZE_BYTES // (1024 * 1024),
        help="Download chunk size in MiB for large files (higher values improve throughput).",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip files that already exist locally with the same size.",
    )
    parser.add_argument(
        "--verify-md5",
        action="store_true",
        help="Compute local MD5 hashes and compare against Drive metadata after download.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List the actions without downloading data.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Set the logging verbosity.",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def load_credentials(credentials_path: Path, token_path: Path) -> Credentials:
    creds: Optional[Credentials] = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def build_drive_service(creds: Credentials):
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def create_backup_directory(destination_root: Path, timestamp_format: str, label: Optional[str]) -> Path:
    timestamp = datetime.utcnow().strftime(timestamp_format)
    suffix = f"_{sanitize_for_fs(label)}" if label else ""
    backup_dir = destination_root / f"{timestamp}{suffix}"
    backup_dir.mkdir(parents=True, exist_ok=False)
    return backup_dir


def sanitize_for_fs(name: Optional[str]) -> str:
    if not name:
        return ""
    safe = "".join(ch if ch not in "\\/:*?\"<>|" else "_" for ch in name)
    return safe.strip() or "untitled"


def iter_children(service, folder_id: str) -> Iterator[Dict[str, str]]:
    page_token: Optional[str] = None
    while True:
        response = (
            service.files()
            .list(
                q=f"'{folder_id}' in parents and trashed = false",
                fields="nextPageToken, files(id, name, mimeType, size, md5Checksum, modifiedTime)",
                pageSize=1000,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                pageToken=page_token,
            )
            .execute()
        )
        for item in response.get("files", []):
            yield item
        page_token = response.get("nextPageToken")
        if not page_token:
            break


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def download_drive_file(
    service,
    file_metadata: Dict[str, str],
    destination: Path,
    chunk_size_bytes: int,
    verify_md5: bool,
    skip_existing: bool,
    dry_run: bool,
) -> bool:
    mime_type = file_metadata["mimeType"]
    file_id = file_metadata["id"]
    original_name = file_metadata["name"]
    target_name = sanitize_for_fs(original_name)
    dest_path = destination / target_name

    export_mime, export_suffix = GOOGLE_EXPORT_MAP.get(mime_type, (None, ""))
    is_google_doc = export_mime is not None

    if skip_existing and dest_path.exists() and not is_google_doc:
        drive_size = int(file_metadata.get("size", "0") or 0)
        if drive_size and dest_path.stat().st_size == drive_size:
            logging.info("Skipping existing %s", dest_path)
            return False

    if dry_run:
        logging.info("[DRY RUN] Would download %s -> %s", original_name, dest_path)
        return False

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    if is_google_doc:
        dest_path = dest_path.with_suffix(export_suffix)
        request = service.files().export_media(fileId=file_id, mimeType=export_mime)
    else:
        request = service.files().get_media(fileId=file_id)

    with open(dest_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request, chunksize=chunk_size_bytes)
        done = False
        attempt = 0
        while not done:
            try:
                status, done = downloader.next_chunk()
                if status:
                    logging.debug("%.1f%% of %s", status.progress() * 100, dest_path.name)
            except HttpError as err:
                attempt += 1
                if attempt > MAX_HTTP_RETRIES:
                    logging.error("Failed to download %s after retries: %s", original_name, err)
                    raise
                wait = HTTP_BACKOFF_SECONDS * attempt
                logging.warning(
                    "Error downloading %s (attempt %d/%d): %s. Retrying in %ds",
                    original_name,
                    attempt,
                    MAX_HTTP_RETRIES,
                    err,
                    wait,
                )
                time.sleep(wait)

    if verify_md5 and not is_google_doc:
        expected = file_metadata.get("md5Checksum")
        if expected:
            actual = md5_checksum(dest_path)
            if actual != expected:
                raise ValueError(
                    f"Checksum mismatch for {dest_path}: expected {expected}, got {actual}"
                )
    logging.info("Downloaded %s", dest_path)
    return True


def md5_checksum(path: Path, chunk_size: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.md5()
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def sync_folder(
    service,
    folder_id: str,
    destination: Path,
    chunk_size_bytes: int,
    verify_md5: bool,
    skip_existing: bool,
    dry_run: bool,
) -> Tuple[int, int]:
    ensure_directory(destination)
    files_downloaded = 0
    files_skipped = 0

    for item in iter_children(service, folder_id):
        name = item["name"]
        mime_type = item["mimeType"]
        target_path = destination / sanitize_for_fs(name)
        if mime_type == FOLDER_MIME:
            logging.debug("Traversing folder %s", target_path)
            sub_downloaded, sub_skipped = sync_folder(
                service,
                item["id"],
                target_path,
                chunk_size_bytes,
                verify_md5,
                skip_existing,
                dry_run,
            )
            files_downloaded += sub_downloaded
            files_skipped += sub_skipped
        else:
            try:
                changed = download_drive_file(
                    service,
                    item,
                    destination,
                    chunk_size_bytes,
                    verify_md5,
                    skip_existing,
                    dry_run,
                )
                if changed:
                    files_downloaded += 1
                else:
                    files_skipped += 1
            except Exception as err:  # noqa: BLE001
                logging.error("Failed processing %s: %s", name, err)
                raise
    return files_downloaded, files_skipped


def main(argv: Optional[Iterable[str]] = None) -> None:
    args = parse_args(argv)
    configure_logging(args.log_level)

    credentials_path = Path(args.credentials_file).expanduser()
    token_path = Path(args.token_file).expanduser()
    destination_root = Path(args.destination_root).expanduser()

    if not credentials_path.exists():
        logging.error(
            "Missing credentials file at %s. Download OAuth client credentials from Google Cloud Console.",
            credentials_path,
        )
        sys.exit(1)

    destination_root.mkdir(parents=True, exist_ok=True)

    creds = load_credentials(credentials_path, token_path)
    service = build_drive_service(creds)

    try:
        backup_dir = create_backup_directory(
            destination_root, args.timestamp_format, args.label
        )
    except FileExistsError:
        logging.error("Target backup directory already exists. Use a different timestamp or label.")
        sys.exit(1)

    logging.info("Starting backup to %s", backup_dir)

    try:
        downloaded, skipped = sync_folder(
            service,
            args.source_folder_id,
            backup_dir,
            chunk_size_bytes=args.chunk_size_mb * 1024 * 1024,
            verify_md5=args.verify_md5,
            skip_existing=args.skip_existing,
            dry_run=args.dry_run,
        )
    finally:
        logging.info("Backup location: %s", backup_dir)

    logging.info("Completed backup: %d files downloaded, %d skipped", downloaded, skipped)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning("Backup interrupted by user.")
        sys.exit(130)
