#!/usr/bin/env python3
"""
Load demo connectors + dummy findings so you can explore the dashboard without real cloud creds.

Usage (from repo root):

  set PYTHONPATH=.
  python scripts/seed_demo_data.py
  python scripts/seed_demo_data.py --reset   # remove previous demo rows, then seed again

Requires the API venv / same dependencies as the backend (SQLAlchemy, passlib not needed here).

Connectors created (no credentials; display-only + account_id linkage for attack paths):
  demo-aws, demo-azure, demo-gcp, demo-k8s

All seeded findings use source=\"demo_seed\" so --reset can remove them safely.
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Repo root on path when run as script
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from sqlalchemy.orm import Session

from api.attack_path_builder import rebuild_all_attack_paths
from api.database.session import Base, SessionLocal, engine
from api.models import Connector, Finding
from api.models.attack_path import AttackPath, AttackPathEdge  # noqa: F401 — register metadata
from api.models.iam_graph import GraphEdge, GraphNode  # noqa: F401
from api.models.k8s_cluster import K8sCluster


def _ensure_schema() -> None:
    """Create missing tables (same as API startup) so seed works on a fresh SQLite file."""
    Base.metadata.create_all(bind=engine)

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _cid(slug: str) -> str:
    """Stable connector id for idempotent seed."""
    return str(uuid.uuid5(_NS, "opencnapp-demo-connector-" + slug))


DEMO_CONNECTORS: list[dict] = [
    {
        "id": _cid("aws"),
        "name": "demo-aws",
        "display_name": "Demo AWS (dummy)",
        "connector_type": "aws",
    },
    {
        "id": _cid("azure"),
        "name": "demo-azure",
        "display_name": "Demo Azure (dummy)",
        "connector_type": "azure",
    },
    {
        "id": _cid("gcp"),
        "name": "demo-gcp",
        "display_name": "Demo GCP (dummy)",
        "connector_type": "gcp",
    },
    {
        "id": _cid("k8s"),
        "name": "demo-k8s",
        "display_name": "Demo Kubernetes (dummy)",
        "connector_type": "kubernetes",
    },
]


def _finding(
    *,
    tool: str,
    domain: str,
    severity: str,
    title: str,
    cloud_provider: str | None,
    account_id: str,
    resource_id: str | None = None,
    resource_name: str | None = None,
    resource_type: str | None = None,
    namespace: str | None = None,
    check_id: str | None = None,
    description: str | None = None,
    compliance: list | None = None,
) -> Finding:
    return Finding(
        id=str(uuid.uuid4()),
        tool=tool,
        source="demo_seed",
        domain=domain,
        severity=severity,
        cloud_provider=cloud_provider,
        account_id=account_id,
        region="us-east-1" if cloud_provider == "aws" else ("eastus" if cloud_provider == "azure" else "us-central1"),
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        namespace=namespace,
        check_id=check_id,
        title=title,
        description=description,
        compliance=compliance or [],
        status="open",
        created_at=datetime.now(timezone.utc) - timedelta(days=hash(title) % 7),
        fingerprint=Finding.compute_fingerprint(tool, check_id, resource_id, title),
    )


def _demo_findings() -> list[Finding]:
    """CSPM-style cloud + KSPM-style cluster findings."""
    rows: list[Finding] = []

    # --- AWS (account_id = connector name so attack_paths pick up connector_id) ---
    aws_acct = "demo-aws"
    rows += [
        _finding(
            tool="prowler",
            domain="cspm",
            severity="CRITICAL",
            title="S3 bucket allows public read access",
            cloud_provider="aws",
            account_id=aws_acct,
            resource_id="arn:aws:s3:::demo-public-assets-bucket",
            resource_name="demo-public-assets-bucket",
            resource_type="AWS::S3::Bucket",
            check_id="s3.bucket-public-read",
            description="Bucket policy or ACL allows public read; demo data.",
            compliance=["CIS-2.1.1"],
        ),
        _finding(
            tool="prowler",
            domain="cspm",
            severity="HIGH",
            title="IAM role has AdministratorAccess attached",
            cloud_provider="aws",
            account_id=aws_acct,
            resource_id="arn:aws:iam::111111111111:role/demo-app-role",
            resource_name="demo-app-role",
            resource_type="AWS::IAM::Role",
            check_id="iam.role-admin-policy",
            compliance=["CIS-1.16"],
        ),
        _finding(
            tool="prowler",
            domain="cspm",
            severity="MEDIUM",
            title="Security group allows SSH from 0.0.0.0/0",
            cloud_provider="aws",
            account_id=aws_acct,
            resource_id="sg-0a1b2c3d4e5f67890",
            resource_type="AWS::EC2::SecurityGroup",
            check_id="ec2.securitygroup-ssh-internet",
            description="Public internet exposure keyword for attack path heuristics.",
        ),
    ]

    # --- Azure ---
    az_acct = "demo-azure"
    rows += [
        _finding(
            tool="prowler",
            domain="cspm",
            severity="HIGH",
            title="Storage account allows public blob access",
            cloud_provider="azure",
            account_id=az_acct,
            resource_id="/subscriptions/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/resourceGroups/demo-rg/providers/Microsoft.Storage/storageAccounts/demostore",
            resource_name="demostore",
            resource_type="Microsoft.Storage/storageAccounts",
            check_id="storage.public-blob",
            compliance=["CIS-3.7"],
        ),
        _finding(
            tool="prowler",
            domain="cspm",
            severity="MEDIUM",
            title="Network security group allows RDP from Internet",
            cloud_provider="azure",
            account_id=az_acct,
            resource_id="/subscriptions/.../networkSecurityGroups/demo-nsg",
            resource_type="Microsoft.Network/networkSecurityGroups",
            check_id="network.nsg-rdp-internet",
        ),
    ]

    # --- GCP ---
    gcp_acct = "demo-gcp"
    rows += [
        _finding(
            tool="prowler",
            domain="cspm",
            severity="CRITICAL",
            title="GCS bucket is publicly accessible",
            cloud_provider="gcp",
            account_id=gcp_acct,
            resource_id="//storage.googleapis.com/demo-public-bucket",
            resource_name="demo-public-bucket",
            resource_type="gcs_bucket",
            check_id="gcs.bucket-public",
            compliance=["CIS-5.2"],
        ),
        _finding(
            tool="prowler",
            domain="cspm",
            severity="LOW",
            title="Default VPC exists in project",
            cloud_provider="gcp",
            account_id=gcp_acct,
            resource_id="projects/demo-project/global/networks/default",
            resource_type="compute.googleapis.com/Network",
            check_id="vpc.default-exists",
        ),
    ]

    # --- Kubernetes / KSPM (connector name demo-k8s; tools/domains match dashboard KSPM rollups) ---
    k8s = "demo-k8s"
    rows += [
        _finding(
            tool="kubescape",
            domain="kspm",
            severity="HIGH",
            title="Workload in kube-system runs as root",
            cloud_provider="kubernetes",
            account_id=k8s,
            namespace="kube-system",
            resource_type="apps/v1/Deployment",
            resource_id="cluster://demo-k8s/kube-system/coredns",
            resource_name="coredns",
            check_id="cluster.contains",
            description="Demo: control-plane namespace workload (fake cluster id in resource_id).",
            compliance=["CIS-5.2.2"],
        ),
        _finding(
            tool="kubebench",
            domain="cis-k8s",
            severity="MEDIUM",
            title="API server anonymous auth is enabled",
            cloud_provider="kubernetes",
            account_id=k8s,
            resource_type="Node",
            resource_id="cluster://demo-k8s/node/control-plane-1",
            resource_name="control-plane-1",
            check_id="CIS-1.2.1",
        ),
        _finding(
            tool="kubescape",
            domain="kspm",
            severity="HIGH",
            title="Ingress exposes service to the public internet",
            cloud_provider="kubernetes",
            account_id=k8s,
            namespace="default",
            resource_type="networking.k8s.io/Ingress",
            resource_id="cluster://demo-k8s/default/demo-ingress",
            resource_name="demo-ingress",
            check_id="network.ingress-public",
            description="Public exposure wording for heuristics.",
        ),
        _finding(
            tool="polaris",
            domain="kspm",
            severity="LOW",
            title="Pod does not define CPU limits",
            cloud_provider="kubernetes",
            account_id=k8s,
            namespace="production",
            resource_type="Pod",
            resource_id="cluster://demo-k8s/production/payments-api-7d9cf",
            resource_name="payments-api-7d9cf",
            check_id="resources.cpu-limits",
        ),
    ]

    return rows


def _clear_demo(db: Session) -> None:
    db.query(Finding).filter(Finding.source == "demo_seed").delete(synchronize_session=False)
    names = [c["name"] for c in DEMO_CONNECTORS]
    ids = [c["id"] for c in DEMO_CONNECTORS]
    db.query(K8sCluster).filter(K8sCluster.connector_id.in_(ids)).delete(synchronize_session=False)
    db.query(Connector).filter(Connector.name.in_(names)).delete(synchronize_session=False)
    db.commit()


def seed(reset: bool) -> dict:
    os.environ["OPENCNAPP_SKIP_ATTACK_PATH_REBUILD"] = "0"
    _ensure_schema()
    db = SessionLocal()
    try:
        if reset:
            _clear_demo(db)
        else:
            existing = db.query(Connector).filter(Connector.name == "demo-aws").first()
            if existing:
                return {
                    "ok": False,
                    "message": "Demo data already present (connector demo-aws exists). Run with --reset to replace.",
                }

        for c in DEMO_CONNECTORS:
            db.merge(
                Connector(
                    id=c["id"],
                    name=c["name"],
                    display_name=c["display_name"],
                    connector_type=c["connector_type"],
                    encrypted_credentials=None,
                    settings={"demo": True},
                    enabled=True,
                )
            )
        db.commit()

        # Cached inventory row for KSPM dashboard widgets
        db.merge(
            K8sCluster(
                connector_id=_cid("k8s"),
                nodes_count=4,
                workloads_count=28,
                namespaces_count=6,
                synced_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        for f in _demo_findings():
            db.add(f)
        db.commit()

        rb = rebuild_all_attack_paths(db)
        return {
            "ok": True,
            "connectors": len(DEMO_CONNECTORS),
            "findings": len(_demo_findings()),
            "attack_path_rebuild": rb,
        }
    finally:
        db.close()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--reset",
        action="store_true",
        help="Remove demo_seed findings and demo-* connectors, then seed again.",
    )
    args = ap.parse_args()
    out = seed(reset=args.reset)
    print(out)
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
