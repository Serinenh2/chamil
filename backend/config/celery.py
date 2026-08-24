import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("chamil")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "alertes-quotidiennes": {
        "task": "apps.alerts.tasks.generate_all_alerts",
        "schedule": crontab(hour=7, minute=0),
    },
    "relances-creances": {
        "task": "apps.alerts.tasks.send_receivable_reminders",
        "schedule": crontab(hour=8, minute=0, day_of_week="mon"),
    },
    "scores-fournisseurs": {
        "task": "apps.partners.tasks.recompute_supplier_scores",
        "schedule": crontab(hour=2, minute=30),
    },
}
