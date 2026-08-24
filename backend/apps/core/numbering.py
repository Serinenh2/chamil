"""Numérotation automatique des documents : PREFIXE-ANNEE-COMPTEUR."""
from django.db import transaction
from django.utils import timezone


@transaction.atomic
def next_number(model, prefix, year=None, field="number", width=4):
    """Génère le prochain numéro libre pour un modèle donné.

    Exemple : next_number(CustomerInvoice, "FA") -> "FA-2026-0042"
    Le verrou de transaction évite les collisions en environnement concurrent.
    """
    year = year or timezone.now().year
    root = f"{prefix}-{year}-"
    last = (
        model.objects.select_for_update()
        .filter(**{f"{field}__startswith": root})
        .order_by(f"-{field}")
        .values_list(field, flat=True)
        .first()
    )
    counter = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{root}{counter:0{width}d}"
