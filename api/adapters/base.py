from abc import ABC, abstractmethod
from typing import Any


class BaseAdapter(ABC):
    tool_name: str

    @abstractmethod
    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        """Return list of unified finding dictionaries compatible with FindingCreate."""
        raise NotImplementedError

    def _severity(self, value: str | None, default: str = "MEDIUM") -> str:
        if not value:
            return default
        normalized = str(value).upper()
        aliases = {"WARNING": "MEDIUM", "ERROR": "HIGH", "CRIT": "CRITICAL"}
        return aliases.get(normalized, normalized)
