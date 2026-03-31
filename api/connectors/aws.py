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
        return {"ok": True}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "aws"}
