from api.connectors.base import CloudConnector


class RegistryConnector(CloudConnector):
    name = "registry"
    display_name = "Container registry"
    credential_fields = [
        {"name": "username", "type": "text"},
        {"name": "password", "type": "password"},
        {"name": "registry_url", "type": "text"},
    ]
    supported_plugins = ["trivy", "grype"]

    def validate(self):
        return {"ok": True, "message": "Registry configuration accepted"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        credentials = credentials or {}
        settings = settings or {}
        url = (credentials.get("registry_url") or settings.get("registry_url") or "").strip()
        if not url:
            return {"ok": False, "message": "registry_url is required", "resource_count": 0}
        try:
            import httpx

            user = (credentials.get("username") or "").strip()
            password = (credentials.get("password") or "").strip()
            auth = (user, password) if (user or password) else None
            probe = url.rstrip("/") + "/v2/"
            r = httpx.get(probe, auth=auth, timeout=20.0, follow_redirects=True)
            ok = r.status_code < 500
            return {
                "ok": ok,
                "message": f"Registry HTTP {r.status_code}" + (" — reachable" if ok else ""),
                "resource_count": 1 if ok else 0,
            }
        except Exception as e:
            return {"ok": False, "message": str(e), "resource_count": 0}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "registry"}
