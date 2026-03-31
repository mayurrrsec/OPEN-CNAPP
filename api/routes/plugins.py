from pathlib import Path
import yaml
from fastapi import APIRouter

router = APIRouter(prefix="/plugins", tags=["plugins"])

@router.get("")
def list_plugins():
    out = []
    for path in Path("plugins").glob("*/plugin.yaml"):
        out.append(yaml.safe_load(path.read_text()))
    return out
