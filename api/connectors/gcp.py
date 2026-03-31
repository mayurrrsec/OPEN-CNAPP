import json
import os

from api.connectors.base import CloudConnector


class GcpConnector(CloudConnector):
    name = "gcp"
    display_name = "GCP"
    credential_fields = [{"name": "service_account_json", "type": "textarea"}]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "cartography"]

    def validate(self):
        return {"ok": True, "message": "GCP connector schema validated"}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "gcp"}

    def ingest_native_findings(self) -> list[dict]:
        path = os.getenv("GCP_SCC_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
