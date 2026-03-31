from api.connectors.base import CloudConnector

class GcpConnector(CloudConnector):
    name = "gcp"
    display_name = "GCP"
    credential_fields = [{"name": "service_account_json", "type": "textarea"}]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "cartography"]

    def validate(self):
        return {"ok": True}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "gcp"}
