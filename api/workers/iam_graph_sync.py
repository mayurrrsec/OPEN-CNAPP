"""Celery task: refresh IAM graph for an AWS connector."""

from api.database.session import SessionLocal
from api.services.iam_graph_sync_aws import sync_aws_iam_graph
from api.workers.celery_app import celery_app


@celery_app.task(name="iam_graph.sync")
def sync_iam_graph_task(connector_name: str) -> dict:
    db = SessionLocal()
    try:
        return sync_aws_iam_graph(db, connector_name)
    finally:
        db.close()
