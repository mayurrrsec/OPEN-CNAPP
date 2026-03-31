from abc import ABC, abstractmethod
from typing import Any

class BaseAdapter(ABC):
    tool_name: str

    @abstractmethod
    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError
