"""Map resource_type (and similar) to a coarse category for Cloud Assets grouping."""

from __future__ import annotations

# Heuristic buckets until a dedicated asset catalog exists.
_RESOURCE_TO_CATEGORY: dict[str, str] = {
    "vm": "compute",
    "virtual_machine": "compute",
    "instance": "compute",
    "storage_account": "storage",
    "s3_bucket": "storage",
    "bucket": "storage",
    "function": "serverless",
    "lambda": "serverless",
    "postgresql": "database",
    "rds": "database",
    "sql": "database",
    "service_account": "identity",
    "iam_role": "identity",
    "role": "identity",
    "pod": "kubernetes",
    "deployment": "kubernetes",
    "daemonset": "kubernetes",
    "statefulset": "kubernetes",
    "job": "kubernetes",
    "cronjob": "kubernetes",
}


def category_for_resource_type(resource_type: str | None) -> str:
    if not resource_type:
        return "unknown"
    key = resource_type.lower().replace(" ", "_").replace("-", "_")
    if key in _RESOURCE_TO_CATEGORY:
        return _RESOURCE_TO_CATEGORY[key]
    for needle, cat in _RESOURCE_TO_CATEGORY.items():
        if needle in key:
            return cat
    return "other"
