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
        return {"ok": True, "message": "On-premises connector validated"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        return {
            "ok": True,
            "message": "No remote API check for VM/on-prem; install agents on hosts as documented.",
            "resource_count": 0,
        }

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "onprem"}
