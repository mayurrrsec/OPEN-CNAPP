from api.adapters.base import BaseAdapter
from api.adapters.prowler import ProwlerAdapter
from api.adapters.gitleaks import GitleaksAdapter
from api.adapters.checkov import CheckovAdapter
from api.adapters.trivy import TrivyAdapter
from api.adapters.grype import GrypeAdapter
from api.adapters.syft import SyftAdapter
from api.adapters.kubebench import KubebenchAdapter
from api.adapters.kubescape import KubescapeAdapter
from api.adapters.polaris import PolarisAdapter
from api.adapters.kubehunter import KubehunterAdapter
from api.adapters.pmapper import PmapperAdapter
from api.adapters.wazuh import WazuhAdapter
from api.adapters.scubagear import ScubagearAdapter
from api.adapters.trufflehog import TrufflehogAdapter
from api.adapters.sonarqube import SonarqubeAdapter
from api.adapters.zap import ZapAdapter
from api.adapters.snyk import SnykAdapter
from api.adapters.sbom import SbomAdapter


ADAPTERS: dict[str, type[BaseAdapter]] = {
    "prowler": ProwlerAdapter,
    "gitleaks": GitleaksAdapter,
    "checkov": CheckovAdapter,
    "trivy": TrivyAdapter,
    "grype": GrypeAdapter,
    "syft": SyftAdapter,
    "kubebench": KubebenchAdapter,
    "kubescape": KubescapeAdapter,
    "polaris": PolarisAdapter,
    "kubehunter": KubehunterAdapter,
    "pmapper": PmapperAdapter,
    "wazuh": WazuhAdapter,
    "scubagear": ScubagearAdapter,
    "trufflehog": TrufflehogAdapter,
    "sonarqube": SonarqubeAdapter,
    "zap": ZapAdapter,
    "snyk": SnykAdapter,
    "sbom": SbomAdapter,
}


# Friendly aliases (folder / CLI names differ from ingest key)
ADAPTER_ALIASES: dict[str, str] = {
    "kube-bench": "kubebench",
    "kube_hunter": "kubehunter",
    "kube-hunter": "kubehunter",
}


def get_adapter(tool: str) -> BaseAdapter | None:
    key = ADAPTER_ALIASES.get(tool, tool)
    cls = ADAPTERS.get(key)
    return cls() if cls else None
