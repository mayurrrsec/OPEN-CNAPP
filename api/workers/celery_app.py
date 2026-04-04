import os
from celery import Celery

celery_app = Celery(
    "opencnapp",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0"),
)
celery_app.conf.task_default_queue = "scans"

# Ensure task modules are imported so @celery_app.task registrations load in the worker process.
import api.workers.iam_graph_sync  # noqa: E402, F401
import api.workers.scanner_runner  # noqa: E402, F401
