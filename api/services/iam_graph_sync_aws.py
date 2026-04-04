"""Populate graph_nodes / graph_edges from AWS IAM (roles + attached managed policies).

Live IAM API calls are **opt-in** (`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`). Default is **off** so
installations rely on **batch ingest** (PMapper / Steampipe / Cartography exports → `POST /graph/ingest`)
instead of polling the control plane from OpenCNAPP.
"""

from __future__ import annotations

import ast
import json
import os
import time
from typing import Any

from sqlalchemy.orm import Session

from api.crypto import decrypt
from api.models import Connector
from api.models.iam_graph import GraphEdge, GraphNode

# Conservative defaults: avoid throttling on large accounts.
_MAX_ROLES = 80
_IAM_SLEEP_S = 0.04


def live_aws_iam_sync_enabled() -> bool:
    """When False (default), `sync_aws_iam_graph` refuses to call AWS IAM — use `POST /graph/ingest` instead."""
    return os.getenv("OPENCNAPP_IAM_LIVE_AWS_SYNC", "0").strip().lower() in ("1", "true", "yes", "on")


def _parse_credentials_blob(raw: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        return ast.literal_eval(raw)
    except Exception:
        try:
            return json.loads(raw)
        except Exception:
            return {}


def _boto3_session_from_connector(credentials: dict[str, Any], settings: dict[str, Any]):
    import boto3

    settings = settings or {}
    creds = credentials or {}
    regions = settings.get("regions") or []
    region = (creds.get("region") or "").strip() or None
    if not region and isinstance(regions, list) and len(regions) > 0:
        region = str(regions[0])
    if not region:
        region = "us-east-1"

    conn_method = (settings.get("connection_method") or "access_keys").strip().lower()
    if conn_method == "sso_profile":
        profile = (creds.get("sso_profile") or settings.get("sso_profile") or "").strip()
        if not profile:
            raise ValueError("AWS SSO profile missing (sso_profile).")
        return boto3.Session(profile_name=profile, region_name=region)

    ak = (creds.get("access_key_id") or "").strip()
    sk = (creds.get("secret_access_key") or "").strip()
    role_arn = (creds.get("role_arn") or settings.get("role_arn") or "").strip()
    ext = (creds.get("external_id") or settings.get("external_id") or "").strip()
    if not ak or not sk:
        raise ValueError("AWS access key ID and secret access key are required for IAM graph sync.")

    sts = boto3.client(
        "sts",
        region_name=region,
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
    )
    if role_arn:
        assumed = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName="opencnapp-iam-graph",
            ExternalId=ext or None,
        )
        c = assumed["Credentials"]
        return boto3.Session(
            aws_access_key_id=c["AccessKeyId"],
            aws_secret_access_key=c["SecretAccessKey"],
            aws_session_token=c["SessionToken"],
            region_name=region,
        )
    return boto3.Session(aws_access_key_id=ak, aws_secret_access_key=sk, region_name=region)


def sync_aws_iam_graph(db: Session, connector_name: str) -> dict[str, Any]:
    """Replace IAM graph rows for this connector with a fresh snapshot (roles + attached policies)."""
    if not live_aws_iam_sync_enabled():
        return {
            "ok": False,
            "error": "live_aws_sync_disabled",
            "message": (
                "Live AWS IAM API sync is disabled. Load graph data with POST /graph/ingest "
                "(batch export from PMapper, Steampipe, Cartography, etc.). "
                "To enable direct boto3 IAM calls, set OPENCNAPP_IAM_LIVE_AWS_SYNC=1 (dev/small accounts only)."
            ),
            "connector": connector_name,
        }

    row = db.query(Connector).filter(Connector.name == connector_name).first()
    if not row:
        return {"ok": False, "error": "connector_not_found", "connector": connector_name}
    if (row.connector_type or "").lower() != "aws":
        return {"ok": False, "error": "not_aws_connector", "connector": connector_name}

    if not row.encrypted_credentials:
        return {"ok": False, "error": "no_credentials", "connector": connector_name}

    creds = _parse_credentials_blob(decrypt(row.encrypted_credentials))
    settings = row.settings or {}

    try:
        session = _boto3_session_from_connector(creds, settings)
    except Exception as e:
        return {"ok": False, "error": "session_failed", "message": str(e)}

    sts = session.client("sts")
    ident = sts.get_caller_identity()
    account_id = str(ident.get("Account") or "")

    region = (creds.get("region") or "").strip() or "us-east-1"
    iam = session.client("iam", region_name=region)

    db.query(GraphEdge).filter(GraphEdge.connector_id == row.id).delete()
    db.query(GraphNode).filter(GraphNode.connector_id == row.id).delete()
    db.commit()

    nodes_by_arn: dict[str, GraphNode] = {}
    edge_count = 0

    def get_or_create_node(*, external_id: str, node_type: str, label: str | None, props: dict | None) -> GraphNode:
        if external_id in nodes_by_arn:
            return nodes_by_arn[external_id]
        n = GraphNode(
            connector_id=row.id,
            cloud_account_id=account_id,
            provider="aws",
            node_type=node_type,
            external_id=external_id,
            label=label or external_id,
            properties=props or {},
        )
        db.add(n)
        db.flush()
        nodes_by_arn[external_id] = n
        return n

    role_count = 0
    paginator = iam.get_paginator("list_roles")
    for page in paginator.paginate():
        for role in page.get("Roles", []):
            if role_count >= _MAX_ROLES:
                break
            role_count += 1
            role_arn = role.get("Arn") or ""
            role_name = role.get("RoleName") or role_arn
            if not role_arn:
                continue
            role_node = get_or_create_node(
                external_id=role_arn,
                node_type="iam_role",
                label=role_name,
                props={"path": role.get("Path")},
            )

            try:
                ap = iam.list_attached_role_policies(RoleName=role_name)
            except Exception:
                time.sleep(_IAM_SLEEP_S)
                continue

            for pol in ap.get("AttachedPolicies", []) or []:
                pol_arn = pol.get("PolicyArn") or ""
                pol_name = pol.get("PolicyName") or pol_arn
                if not pol_arn:
                    continue
                pol_node = get_or_create_node(
                    external_id=pol_arn,
                    node_type="iam_policy_managed",
                    label=pol_name,
                    props={},
                )
                e = GraphEdge(
                    connector_id=row.id,
                    source_node_id=role_node.id,
                    target_node_id=pol_node.id,
                    edge_type="ATTACHED",
                    properties={"scope": "managed"},
                )
                db.add(e)
                edge_count += 1

            time.sleep(_IAM_SLEEP_S)

        if role_count >= _MAX_ROLES:
            break

    db.commit()

    return {
        "ok": True,
        "connector": connector_name,
        "connector_id": row.id,
        "account_id": account_id,
        "nodes": len(nodes_by_arn),
        "edges": edge_count,
        "roles_scanned": role_count,
        "truncated_roles": role_count >= _MAX_ROLES,
        "max_roles": _MAX_ROLES,
    }
