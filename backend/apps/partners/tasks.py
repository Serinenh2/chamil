"""Tâches Celery liées aux partenaires."""
from celery import shared_task


@shared_task(name="apps.partners.tasks.recompute_supplier_scores")
def recompute_supplier_scores():
    """Recalcule le score de chaque fournisseur à partir de ses évaluations."""
    from django.db.models import Avg

    from .models import Supplier, SupplierEvaluation

    updated = 0
    for supplier in Supplier.objects.filter(is_active=True):
        evaluations = SupplierEvaluation.objects.filter(supplier=supplier)
        if not evaluations.exists():
            continue
        averages = evaluations.aggregate(
            **{c: Avg(c) for c in SupplierEvaluation.CRITERIA}
        )
        values = [v for v in averages.values() if v is not None]
        supplier.score = round(sum(values) / len(values), 2)
        supplier.save(update_fields=["score"])
        updated += 1
    return {"suppliers_updated": updated}
