# Repository Guidelines

## Project Structure & Module Organization
Current automation lives in `sync.py` at the repo root. Add reusable packages under `src/blank_repo/` with an `__init__.py`, and keep integration or CLI entrypoints in the root `sync.py` (or a sibling `main.py`) for discoverability. Co-locate fixtures and sample payloads inside `tests/fixtures/` and document non-trivial data shapes in `docs/` as short Markdown notes.

## Build, Test, and Development Commands
- `python -m venv .venv && source .venv/bin/activate` creates an isolated environment for dependencies.
- `pip install -r requirements.txt` installs runtime and dev tooling once a requirements file is added.
- `python sync.py --help` verifies the primary workflow and surfaces available flags.
- `pytest` runs the full automated test suite; pass `-k <pattern>` when targeting a subset locally.

## Coding Style & Naming Conventions
Use Black-formatted Python (4-space indents, 88-character lines) and keep imports sorted with `ruff --fix`. Name modules and functions with `snake_case`, classes with `PascalCase`, and constants in `UPPER_SNAKE_CASE`. Prefer explicit type hints for new public functions, and include docstrings on modules or functions that orchestrate external services.

## Testing Guidelines
Write unit tests with `pytest` inside `tests/`, mirroring the source module path (e.g., `tests/test_sync.py`). Use descriptive test names such as `test_handles_missing_token`. Target ≥90% branch coverage for new features; run `pytest --cov=src/blank_repo --cov-report=term-missing` before opening a pull request. Mock external API calls so the suite remains deterministic and offline-friendly.

## Commit & Pull Request Guidelines
Follow Conventional Commits (e.g., `feat: add delta sync command`) so changelog tooling can parse updates. Each commit should address a focused concern and include relevant tests or docs. Pull requests must describe the change, list verification steps (commands run, screenshots if UI), and link the tracking issue. Request review from a maintainer, ensure CI succeeds, and update the PR title to match the release note you expect.

## Security & Configuration Tips
Never hardcode secrets in the repository. Store sensitive tokens in environment variables or `.env` files ignored by Git, and document required keys in a secure internal wiki. Validate configuration values at startup and fail fast with actionable error messages.
