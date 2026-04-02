import json
import os

import httpx

from api.connectors.base import CloudConnector


class GcpConnector(CloudConnector):
    name = "gcp"
    display_name = "GCP"
    credential_fields = [{"name": "service_account_json", "type": "textarea"}]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "cartography"]

    def validate(self):
        return {"ok": True, "message": "GCP connector schema validated"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        credentials = credentials or {}
        settings = settings or {}
        raw = (credentials.get("private_key") or "").strip()
        project = (credentials.get("project_id") or "").strip()
        email = (credentials.get("client_email") or "").strip()
        try:
            import google.auth.transport.requests
            from google.oauth2 import service_account

            if raw.startswith("{"):
                info = json.loads(raw)
            else:
                info = {
                    "type": "service_account",
                    "project_id": project,
                    "private_key": raw,
                    "client_email": email,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            scopes = ["https://www.googleapis.com/auth/cloud-platform.read-only"]
            creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            req = google.auth.transport.requests.Request()
            creds.refresh(req)
            pid = info.get("project_id") or project
            if not pid:
                return {"ok": False, "message": "project_id is required", "resource_count": 0}
            url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{pid}"
            r = httpx.get(url, headers={"Authorization": f"Bearer {creds.token}"}, timeout=30.0)
            if r.status_code == 200:
                return {"ok": True, "message": f"GCP project accessible: {pid}", "resource_count": 1}
            return {"ok": False, "message": r.text[:400], "resource_count": 0}
        except Exception as e:
            return {"ok": False, "message": str(e), "resource_count": 0}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "gcp"}

    def ingest_native_findings(self) -> list[dict]:
        # Priority 1: direct SCC API pull
        try:
            from google.cloud import securitycenter

            org_id = os.getenv("GCP_ORG_ID")
            if org_id:
                client = securitycenter.SecurityCenterClient()
                source = f"organizations/{org_id}/sources/-"
                return [f for f in client.list_findings(request={"parent": source})]
        except Exception:
            pass

        # Priority 2: offline/import file
        path = os.getenv("GCP_SCC_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
