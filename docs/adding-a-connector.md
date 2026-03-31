# Adding a connector
1. Add `api/connectors/<name>.py` implementing `CloudConnector`.
2. Register credentials and supported plugins.
3. Expose connector via `/connectors` route.
