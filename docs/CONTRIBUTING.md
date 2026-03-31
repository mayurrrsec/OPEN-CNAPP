# Contributing to OpenCNAPP

## Development setup
1. Fork and clone the repo.
2. Run `docker compose up --build`.
3. Open API docs at `http://localhost:8000/docs`.

## Contribution flow
1. Create a feature branch.
2. Add/update tests for adapters/routes you changed.
3. Run `python -m unittest discover -s tests`.
4. Submit a PR with a clear summary and validation steps.

## Coding expectations
- Keep adapters deterministic and idempotent.
- New tools should include `plugins/<tool>/plugin.yaml` + `api/adapters/<tool>.py`.
- Avoid leaking credentials in logs.
