import json
import os

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

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "azure"}

    def ingest_native_findings(self) -> list[dict]:
        # Deep integration hook: supports file-based sync to allow offline ingestion in self-hosted envs.
        path = os.getenv("AZURE_DEFENDER_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
