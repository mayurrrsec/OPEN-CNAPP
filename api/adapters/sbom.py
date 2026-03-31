from api.adapters.base import BaseAdapter


class SbomAdapter(BaseAdapter):
    tool_name = "sbom"

    def normalize(self, payload: dict):
        # Supports CycloneDX (components) and SPDX (packages)
        rows = []
        if "components" in payload:
            for c in payload.get("components", []):
                rows.append({"name": c.get("name"), "version": c.get("version"), "purl": c.get("purl")})
        if "packages" in payload:
            for p in payload.get("packages", []):
                rows.append({"name": p.get("name"), "version": p.get("versionInfo"), "purl": p.get("externalRefs", [{}])[0].get("referenceLocator") if p.get("externalRefs") else None})

        out = []
        for r in rows:
            out.append({
                "tool": self.tool_name,
                "source": "ci_ingest",
                "domain": "sbom",
                "severity": "INFO",
                "check_id": r.get("purl"),
                "resource_id": r.get("name"),
                "title": f"SBOM package: {r.get('name', 'unknown')}",
                "description": f"Version: {r.get('version', 'n/a')}",
                "raw": r,
            })
        return out
