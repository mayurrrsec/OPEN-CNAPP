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
        return {"ok": True}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "azure"}
