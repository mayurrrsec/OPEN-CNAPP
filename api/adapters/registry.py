from api.adapters.base import BaseAdapter
from api.adapters.prowler import ProwlerAdapter
from api.adapters.gitleaks import GitleaksAdapter
from api.adapters.checkov import CheckovAdapter
from api.adapters.trivy import TrivyAdapter


ADAPTERS: dict[str, type[BaseAdapter]] = {
    "prowler": ProwlerAdapter,
    "gitleaks": GitleaksAdapter,
    "checkov": CheckovAdapter,
    "trivy": TrivyAdapter,
}


def get_adapter(tool: str) -> BaseAdapter | None:
    cls = ADAPTERS.get(tool)
    return cls() if cls else None
