# Deep integration status

## Implemented now
- Native ingest API endpoints for Azure Defender, AWS Security Hub, and GCP SCC file-backed sync (`/native-ingest/{provider}`).
- Scanner runner upgraded to attempt Docker image execution from plugin registry when docker socket is present.
- Active scan authorization gate in `/scans/trigger`.
- Attack path API and UI page backed by normalized findings graph.
- Compliance heatmap and CSV reporting endpoints.

## Production hardening TODO
- Replace file-backed native ingest with direct cloud SDK clients and pagination/token refresh.
- Add per-tool runner command templates + mounted credential env from connectors.
- Persist scan-progress events via Redis pub/sub and broadcast through dedicated ws channels.
- Add RBAC and SSO/OIDC in addition to local JWT login.
- Add integration tests with sample scanner outputs.
