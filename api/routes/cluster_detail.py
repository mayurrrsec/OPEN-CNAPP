"""Cluster detail sub-resources for KSPM inventory (per connector id)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.inventory.cluster_detail_service import (
    alerts_insights,
    alerts_query,
    app_behaviour_insights,
    app_behaviour_query,
    cluster_info_from_findings,
    compliance_findings_query,
    compliance_insights,
    connection_status_from_findings,
    finding_to_dict,
    finding_to_dict_compliance,
    finding_to_dict_event,
    finding_to_dict_vuln,
    findings_trend_for_connector,
    kiem_insights,
    kiem_query,
    k8s_resource_summary_counts,
    misconfig_insights,
    paginated_cloud_asset_groups,
    paginated_misconfiguration_findings,
    paginated_policies_by_check,
    paginated_query_findings,
    vulnerability_insights,
    vulnerability_query,
)
from api.models import Connector, Finding

router = APIRouter(
    prefix="/inventory/clusters",
    tags=["inventory-cluster-detail"],
    dependencies=[Depends(get_current_user)],
)

_K8S_TYPES = ("kubernetes", "onprem")

_K8S_METRIC_KEYS = [
    "readiness_probe",
    "liveness_probe",
    "image_tag_not_latest",
    "immutable_container_fs",
    "cpu_limits",
    "memory_limits",
    "common_labels",
    "cronjob",
    "naked_pods",
]


def _get_k8s_connector(db: Session, cluster_id: str) -> Connector:
    c = db.query(Connector).filter(Connector.id == cluster_id).first()
    if not c or (c.connector_type or "").lower() not in _K8S_TYPES:
        raise HTTPException(status_code=404, detail="Cluster connector not found")
    return c


@router.get("/{cluster_id}/status")
def cluster_connection_status(cluster_id: str, db: Session = Depends(get_db)):
    c = _get_k8s_connector(db, cluster_id)
    return {"connection_status": connection_status_from_findings(db, c)}


@router.get("/{cluster_id}/overview")
def cluster_overview(cluster_id: str, db: Session = Depends(get_db)):
    c = _get_k8s_connector(db, cluster_id)
    summary = k8s_resource_summary_counts(db, c, _K8S_METRIC_KEYS)
    trend = findings_trend_for_connector(db, c, days=14)
    info = cluster_info_from_findings(db, c)
    return {
        "cluster_id": cluster_id,
        "connection_status": connection_status_from_findings(db, c),
        "k8s_resource_summary": summary,
        "findings_trend": trend,
        "cluster_info": info,
        "connection_history": [],
        "nodes": [],
    }


@router.get("/{cluster_id}/misconfigurations")
def cluster_misconfigurations(
    cluster_id: str,
    db: Session = Depends(get_db),
    severity: str = Query("all", description="Comma severities e.g. CRITICAL,HIGH or all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = misconfig_insights(db, c)
    total, items = paginated_misconfiguration_findings(
        db, c, severity=severity, search=search, page=page, limit=limit
    )
    return {
        "insights": insights,
        "findings": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/cloud-assets")
def cluster_cloud_assets(
    cluster_id: str,
    db: Session = Depends(get_db),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    total, items = paginated_cloud_asset_groups(
        db, c, severity=severity, search=search, page=page, limit=limit
    )
    return {"total": total, "page": page, "items": items}


@router.get("/{cluster_id}/vulnerabilities")
def cluster_vulnerabilities(
    cluster_id: str,
    db: Session = Depends(get_db),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = vulnerability_insights(db, c)
    total, items = paginated_query_findings(
        db,
        c,
        vulnerability_query(db, c),
        severity=severity,
        search=search,
        page=page,
        limit=limit,
        row_mapper=finding_to_dict_vuln,
    )
    return {
        "insights": insights,
        "findings": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/alerts")
def cluster_alerts(
    cluster_id: str,
    db: Session = Depends(get_db),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = alerts_insights(db, c)
    total, items = paginated_query_findings(
        db,
        c,
        alerts_query(db, c),
        severity=severity,
        search=search,
        page=page,
        limit=limit,
        row_mapper=finding_to_dict,
    )
    return {
        "insights": insights,
        "alerts": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/compliance")
def cluster_compliance(
    cluster_id: str,
    db: Session = Depends(get_db),
    framework: str = Query("all"),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = compliance_insights(db, c)
    total, items = paginated_query_findings(
        db,
        c,
        compliance_findings_query(db, c),
        severity=severity,
        search=search,
        page=page,
        limit=limit,
        row_mapper=finding_to_dict_compliance,
    )
    return {
        "insights": insights,
        "findings": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/policies")
def cluster_policies(
    cluster_id: str,
    db: Session = Depends(get_db),
    status: str = Query("all"),
    search: str = Query(""),
    severity: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    total, items = paginated_policies_by_check(
        db, c, status=status, search=search, severity=severity, page=page, limit=limit
    )
    return {
        "insights": {"by_category": [], "alerts_trend": []},
        "policies": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/app-behaviour")
def cluster_app_behaviour(
    cluster_id: str,
    db: Session = Depends(get_db),
    event_type: str = Query("all"),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = app_behaviour_insights(db, c)
    base = app_behaviour_query(db, c)
    if event_type and event_type.lower() not in ("all", ""):
        base = base.filter(Finding.tool == event_type)
    total, items = paginated_query_findings(
        db,
        c,
        base,
        severity=severity,
        search=search,
        page=page,
        limit=limit,
        row_mapper=finding_to_dict_event,
    )
    return {
        "insights": insights,
        "events": {"total": total, "page": page, "items": items},
    }


@router.get("/{cluster_id}/kiem")
def cluster_kiem(
    cluster_id: str,
    db: Session = Depends(get_db),
    severity: str = Query("all"),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    c = _get_k8s_connector(db, cluster_id)
    insights = kiem_insights(db, c)
    total, items = paginated_query_findings(
        db,
        c,
        kiem_query(db, c),
        severity=severity,
        search=search,
        page=page,
        limit=limit,
        row_mapper=finding_to_dict,
    )
    return {
        "insights": insights,
        "findings": {"total": total, "page": page, "items": items},
    }
