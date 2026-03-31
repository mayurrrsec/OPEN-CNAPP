from api.adapters.base import BaseAdapter
from api.adapters.prowler import ProwlerAdapter
from api.adapters.gitleaks import GitleaksAdapter
from api.adapters.checkov import CheckovAdapter
from api.adapters.trivy import TrivyAdapter
from api.adapters.grype import GrypeAdapter
from api.adapters.syft import SyftAdapter
from api.adapters.kubebench import KubebenchAdapter
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


def get_adapter(tool: str) -> BaseAdapter | None:
    cls = ADAPTERS.get(tool)
    return cls() if cls else None
