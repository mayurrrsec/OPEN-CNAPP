from api.connectors.base import CloudConnector

class KubernetesConnector(CloudConnector):
    name = "kubernetes"
    display_name = "Kubernetes"
    credential_fields = [{"name": "kubeconfig", "type": "textarea"}]
    supported_plugins = ["kubescape", "kube-bench", "polaris", "falco", "trivy-operator"]

    def validate(self):
        return {"ok": True, "message": "Kubernetes connector validated"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        return {
            "ok": True,
            "message": "No remote API check for Kubernetes; run the install command in your cluster.",
            "resource_count": 0,
        }

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "kubernetes"}
