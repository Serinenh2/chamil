"""Calcul des totaux commerciaux, partagé par les devis, commandes et factures."""
from decimal import ROUND_HALF_UP, Decimal

TWO = Decimal("0.01")


def q(value):
    return Decimal(value or 0).quantize(TWO, rounding=ROUND_HALF_UP)


def line_totals(quantity, unit_price, discount_rate=0, vat_rate=0):
    """Retourne (HT, TVA, TTC) pour une ligne de document."""
    gross = Decimal(quantity or 0) * Decimal(unit_price or 0)
    net = gross * (Decimal(1) - Decimal(discount_rate or 0) / Decimal(100))
    vat = net * Decimal(vat_rate or 0) / Decimal(100)
    return q(net), q(vat), q(net + vat)


def document_totals(lines):
    """Agrège les lignes d'un document. `lines` expose amount_ht / amount_vat."""
    ht = sum((Decimal(l.amount_ht or 0) for l in lines), Decimal(0))
    vat = sum((Decimal(l.amount_vat or 0) for l in lines), Decimal(0))
    return q(ht), q(vat), q(ht + vat)
