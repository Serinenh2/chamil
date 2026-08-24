"""Génération des documents PDF bilingues — section 27 et 39.4.

WeasyPrint est utilisé pour son support natif de l'arabe et du sens RTL.
Le logo, le cachet et la signature proviennent du profil (section 39.4).
"""
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


def document_context(document, kind):
    """Contexte commun à tous les modèles de documents."""
    from apps.company.models import CommercialSettings, Company

    company = Company.current()
    settings_obj = CommercialSettings.current()
    owner = company.owners.first() if company else None
    return {
        "document": document,
        "kind": kind,
        "lines": document.lines.all() if hasattr(document, "lines") else [],
        "company": company,
        "settings": settings_obj,
        "owner": owner,
        "language": settings_obj.document_language if settings_obj else "both",
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
