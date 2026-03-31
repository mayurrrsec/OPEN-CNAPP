from api.connectors.base import CloudConnector

class KubernetesConnector(CloudConnector):
    name = "kubernetes"
    display_name = "Kubernetes"
    credential_fields = [{"name": "kubeconfig", "type": "textarea"}]
    supported_plugins = ["kubescape", "kube-bench", "polaris", "falco", "trivy-operator"]

    def validate(self):
        return {"ok": True}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "kubernetes"}
