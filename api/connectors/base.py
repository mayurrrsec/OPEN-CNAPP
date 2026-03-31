from abc import ABC, abstractmethod

class CloudConnector(ABC):
    name: str
    display_name: str
    credential_fields: list[dict]
    supported_plugins: list[str]

    @abstractmethod
    def validate(self) -> dict:
        raise NotImplementedError

    @abstractmethod
    def get_scan_env(self) -> dict[str, str]:
        raise NotImplementedError

    def list_resources(self) -> list[dict]:
        return []

    def ingest_native_findings(self) -> list[dict]:
        return []
