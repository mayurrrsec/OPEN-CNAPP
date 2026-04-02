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

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        """Live check for POST /connectors/test. Override in cloud providers for STS/ARM/API calls."""
        credentials = credentials or {}
        settings = settings or {}
        base = self.validate()
        if "message" not in base:
            base = {**base, "message": "Schema check passed"}
        rc = 0
        try:
            rc = len(self.list_resources() or [])
        except Exception:
            rc = 0
        return {**base, "resource_count": rc}

    def ingest_native_findings(self) -> list[dict]:
        return []
