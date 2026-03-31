import json
import os

from api.connectors.base import CloudConnector


class AwsConnector(CloudConnector):
    name = "aws"
    display_name = "AWS"
    credential_fields = [
        {"name": "access_key_id", "type": "text"},
        {"name": "secret_access_key", "type": "password"},
        {"name": "region", "type": "text"},
    ]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "pmapper", "cloudfox"]

    def validate(self):
        return {"ok": True, "message": "AWS connector schema validated"}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "aws"}

    def ingest_native_findings(self) -> list[dict]:
        path = os.getenv("AWS_SECURITY_HUB_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
