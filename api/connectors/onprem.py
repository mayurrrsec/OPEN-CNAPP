from api.connectors.base import CloudConnector

class OnpremConnector(CloudConnector):
    name = "onprem"
    display_name = "On-prem"
    credential_fields = [
        {"name": "ssh_user", "type": "text"},
        {"name": "ssh_key", "type": "textarea"},
    ]
    supported_plugins = ["wazuh", "falco", "nuclei", "nmap"]

    def validate(self):
        return {"ok": True}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "onprem"}
