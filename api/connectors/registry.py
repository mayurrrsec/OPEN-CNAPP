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

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "registry"}
