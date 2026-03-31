from api.adapters.base import BaseAdapter
from api.adapters.prowler import ProwlerAdapter
from api.adapters.gitleaks import GitleaksAdapter
from api.adapters.checkov import CheckovAdapter
from api.adapters.trivy import TrivyAdapter
from api.adapters.grype import GrypeAdapter
from api.adapters.syft import SyftAdapter


ADAPTERS: dict[str, type[BaseAdapter]] = {
    "prowler": ProwlerAdapter,
    "gitleaks": GitleaksAdapter,
    "checkov": CheckovAdapter,
    "trivy": TrivyAdapter,
    "grype": GrypeAdapter,
    "syft": SyftAdapter,
}


def get_adapter(tool: str) -> BaseAdapter | None:
    cls = ADAPTERS.get(tool)
    return cls() if cls else None
