# Google Drive to iCloud Backup

This project automates pulling data from Google Drive into a timestamped archive inside iCloud Drive. Each run creates a folder named after the UTC timestamp (and optional label) so you can keep immutable snapshots or roll back to a prior copy.

## Prerequisites
- macOS with iCloud Drive enabled (`~/Library/Mobile Documents/com~apple~CloudDocs`).
- Python 3.10+ and the ability to create virtual environments.
- A Google Cloud project with the Drive API enabled and a desktop OAuth client credential (`credentials.json`).

## Setup
1. Clone the repository and create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
2. Place your Google OAuth client file at `credentials.json` in the repo root. The first run launches a browser window so you can grant access to Google Drive; the resulting refresh token is stored in `token.json`.
3. (Optional) Adjust the default destination by editing `--destination-root`. The default points to `~/Library/Mobile Documents/com~apple~CloudDocs/DriveBackups` so iCloud syncs the backups automatically.

## Running a Backup
Execute the sync script; a new folder like `2024-05-12_031522_full-drive` is created for each run.
```bash
python sync.py \
  --source-folder-id root \
  --label full-drive \
  --skip-existing \
  --verify-md5
```
Key flags:
- `--source-folder-id`: Back up a specific Google Drive folder (use Drive’s “Get link” to copy the ID).
- `--skip-existing`: Re-run efficiently by skipping files whose sizes already match locally.
- `--verify-md5`: Hash downloaded files and compare to Google’s checksum for integrity.
- `--chunk-size-mb`: Increase (e.g. `128`) for faster throughput on fast networks; decrease if you hit throttling.
- `--dry-run`: Preview tasks without transferring data.

## Working with Large Data Sets
The downloader streams 32 MiB chunks with automatic retries so multi-hundred-GB transfers can resume on transient failures. iCloud Drive uploads the completed files in the background; keep the Mac awake and connected until Finder shows the new backup folder fully synced. When backing up frequently, use the same destination root so older timestamped folders remain available for auditing or point-in-time restore.

## Folder Structure
```
DriveBackups/
└── 2024-05-12_031522_full-drive/
    ├── Reports/
    │   └── 2023/
    └── Photos/
        └── IMG_0001.jpg
```
Each backup folder mirrors the Google Drive hierarchy, making it easy to inspect or compare snapshots.
