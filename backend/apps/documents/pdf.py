"""Génération des documents PDF bilingues — section 27 et 39.4.

WeasyPrint est utilisé pour son support natif de l'arabe et du sens RTL.
Le logo, le cachet et la signature proviennent du profil (section 39.4).
"""
from decimal import Decimal
from io import BytesIO

from django.template.loader import render_to_string


def render_document_pdf(template_name, context, base_url=None):
    """Retourne les octets du PDF, ou None si WeasyPrint n'est pas installé."""
    html = render_to_string(template_name, context)
    try:
        from weasyprint import HTML
    except ImportError:  # environnement de développement sans WeasyPrint
        return None
    buffer = BytesIO()
    HTML(string=html, base_url=base_url).write_pdf(buffer)
    return buffer.getvalue()


def amount_in_words(amount, currency="DA"):
    """Convertit un montant en toutes lettres françaises — mentions légales."""
    from num2words import num2words

    amount = Decimal(amount or 0).quantize(Decimal("0.01"))
    integer_part = int(amount)
    cents = int((amount - integer_part) * 100)
    if currency == "DA":
        currency_name = "dinars algériens" if integer_part > 1 else "dinar algérien"
    else:
        currency_name = currency

    words = num2words(integer_part, lang="fr").capitalize()
    text = f"{words} {currency_name}"
    if cents:
        cents_words = num2words(cents, lang="fr")
        text += f" et {cents_words} centime{'s' if cents > 1 else ''}"
    return text


# Nombre approximatif de lignes qui tiennent sur la 1ère page (avec l'en-tête,
# le titre et l'encart destinataire au-dessus) puis sur les pages suivantes
# (qui démarrent directement par le tableau) — calibré visuellement.
QUOTE_FIRST_PAGE_LINES = 8
QUOTE_OTHER_PAGE_LINES = 15


def _quote_line_pages(lines):
    """Découpe les lignes du devis par page avec sous-total de report.

    Renvoie None si tout tient sur une seule page (rendu par défaut,
    pagination naturelle de WeasyPrint) ou la liste des pages sinon,
    chacune portant son propre sous-total et le sous-total reporté de
    la page précédente (section : sous-total page 1 + sous-total page 2
    + ... = total général du document, déjà affiché en pied de document).
    """
    lines = list(lines)
    if len(lines) <= QUOTE_FIRST_PAGE_LINES:
        return None
    chunks = []
    idx, size = 0, QUOTE_FIRST_PAGE_LINES
    while idx < len(lines):
        chunks.append(lines[idx:idx + size])
        idx += size
        size = QUOTE_OTHER_PAGE_LINES
    subtotals = [sum((line.amount_ht for line in chunk), Decimal("0")) for chunk in chunks]
    return [
        {
            "lines": chunk,
            "subtotal_ht": subtotals[i],
            "is_last": i == len(chunks) - 1,
            "report_amount": subtotals[i - 1] if i > 0 else None,
        }
        for i, chunk in enumerate(chunks)
    ]


REFERENCE_DATE_FIELD = {
    "quote": ("valid_until", "Validité"),
    "sales_order": ("expected_on", "Livraison prévue"),
    "delivery": ("delivered_on", "Date de livraison"),
    "customer_invoice": ("due_date", "Échéance"),
    "purchase_order": ("expected_on", "Livraison prévue"),
    "goods_receipt": ("received_on", "Date de réception"),
}


def document_context(document, kind):
    """Contexte commun à tous les modèles de documents."""
    from apps.company.models import CommercialSettings, Company

    company = Company.current()
    settings_obj = CommercialSettings.current()
    owner = company.owners.first() if company else None
    currency = settings_obj.currency if settings_obj else "DA"
    field, label = REFERENCE_DATE_FIELD.get(kind, (None, None))
    party = getattr(document, "customer", None) or getattr(document, "supplier", None)
    lines = document.lines.all() if hasattr(document, "lines") else []
    line_pages = _quote_line_pages(lines) if kind == "quote" else None
    return {
        "document": document,
        "kind": kind,
        "party": party,
        "lines": lines,
        "line_pages": line_pages,
        "multipage": bool(line_pages),
        "company": company,
        "settings": settings_obj,
        "owner": owner,
        "language": settings_obj.document_language if settings_obj else "both",
        "amount_words": amount_in_words(document.amount_ttc, currency),
        "reference_date": getattr(document, field, None) if field else None,
        "reference_date_label": label,
    }


TEMPLATES = {
    "quote": "documents/quote.html",
    "sales_order": "documents/sales_order.html",
    "delivery": "documents/delivery.html",
    "customer_invoice": "documents/invoice.html",
    "purchase_order": "documents/purchase_order.html",
    "goods_receipt": "documents/goods_receipt.html",
}


def resolve_document(kind, pk):
    from apps.billing.models import CustomerInvoice
    from apps.purchasing.models import GoodsReceipt, PurchaseOrder
    from apps.sales.models import Delivery, Quote, SalesOrder

    models = {
        "quote": Quote, "sales_order": SalesOrder, "delivery": Delivery,
        "customer_invoice": CustomerInvoice, "purchase_order": PurchaseOrder,
        "goods_receipt": GoodsReceipt,
    }
    model = models.get(kind)
    if not model:
        raise ValueError(f"Type de document inconnu : {kind}")
    return model.objects.get(pk=pk)
