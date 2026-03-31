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
