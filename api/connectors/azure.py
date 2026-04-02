import json
import os

import httpx

from api.connectors.base import CloudConnector


class AzureConnector(CloudConnector):
    name = "azure"
    display_name = "Azure"
    credential_fields = [
        {"name": "subscription_id", "type": "text"},
        {"name": "tenant_id", "type": "text"},
        {"name": "client_id", "type": "text"},
        {"name": "client_secret", "type": "password"},
    ]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "bloodhound"]

    def validate(self):
        return {"ok": True, "message": "Azure connector schema validated"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        credentials = credentials or {}
        settings = settings or {}
        tid = (credentials.get("tenant_id") or "").strip()
        cid = (credentials.get("client_id") or "").strip()
        sec = (credentials.get("client_secret") or "").strip()
        sub = (credentials.get("subscription_id") or "").strip()
        if not all([tid, cid, sec, sub]):
            return {
                **self.validate(),
                "message": "Provide tenant ID, client ID, client secret, and subscription ID to test.",
                "resource_count": 0,
            }
        try:
            from azure.identity import ClientSecretCredential

            cred = ClientSecretCredential(tid, cid, sec)
            token = cred.get_token("https://management.azure.com/.default")
            url = f"https://management.azure.com/subscriptions/{sub}/resourcegroups"
            r = httpx.get(
                url,
                params={"api-version": "2021-04-01"},
                headers={"Authorization": f"Bearer {token.token}"},
                timeout=30.0,
            )
            if r.status_code == 200:
                n = len(r.json().get("value", []))
                return {
                    "ok": True,
                    "message": f"Azure subscription reachable ({n} resource group(s))",
                    "resource_count": n,
                }
            return {"ok": False, "message": r.text[:400], "resource_count": 0}
        except Exception as e:
            return {"ok": False, "message": str(e), "resource_count": 0}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "azure"}

    def ingest_native_findings(self) -> list[dict]:
        # Priority 1: direct Defender API pull
        try:
            from azure.identity import DefaultAzureCredential
            from azure.mgmt.security import SecurityCenter

            subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID", "")
            if subscription_id:
                client = SecurityCenter(credential=DefaultAzureCredential(), subscription_id=subscription_id)
                out = []
                for a in client.alerts.list():
                    out.append(a.as_dict())
                return out
        except Exception:
            pass

        # Priority 2: offline/import file
        path = os.getenv("AZURE_DEFENDER_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
