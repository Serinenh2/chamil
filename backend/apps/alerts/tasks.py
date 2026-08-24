"""Génération automatique des alertes — exécutée chaque matin par Celery Beat."""
from datetime import timedelta

from celery import shared_task
from django.db.models import F
from django.utils import timezone

from apps.core.models import Urgency

from .models import Alert, AlertCategory, AlertCode


def _upsert(code, category, severity, title, message, entity_type, entity_id, link):
    """Évite les doublons : une alerte ouverte par entité et par type."""
    alert, created = Alert.objects.get_or_create(
        code=code, entity_type=entity_type, entity_id=entity_id, is_resolved=False,
        defaults={"category": category, "severity": severity, "title": title,
                  "message": message, "link": link},
    )
    if not created:
        alert.severity, alert.title, alert.message = severity, title, message
        alert.save(update_fields=["severity", "title", "message"])
    return created


@shared_task(name="apps.alerts.tasks.generate_stock_alerts")
def generate_stock_alerts():
    from apps.stock.models import StockItem

    created = 0
    for item in StockItem.objects.select_related("product").filter(
            quantity__lte=F("product__min_stock")):
        out = item.quantity <= 0
        created += _upsert(
            AlertCode.STOCK_OUT if out else AlertCode.STOCK_LOW,
            AlertCategory.STOCK,
            Urgency.CRITICAL if out else Urgency.HIGH,
            f"{'Rupture' if out else 'Stock faible'} : {item.product.designation}",
            f"Quantité en stock : {item.quantity} (seuil {item.product.min_stock}).",
            "product", item.product_id, f"/produits/{item.product_id}",
        )
    return {"stock_alerts_created": created}


@shared_task(name="apps.alerts.tasks.generate_receivable_alerts")
def generate_receivable_alerts():
    from apps.billing.models import CustomerInvoice, InvoiceStatus

    created = 0
    today = timezone.now().date()
    for invoice in CustomerInvoice.objects.select_related("customer").exclude(
            status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED]):
        if not invoice.due_date or invoice.due_date >= today or invoice.balance <= 0:
            continue
        days = invoice.days_overdue
        severity = (Urgency.CRITICAL if days > 90 else
                    Urgency.HIGH if days > 30 else Urgency.MEDIUM)
        created += _upsert(
            AlertCode.CUSTOMER_INVOICE_OVERDUE, AlertCategory.CUSTOMER, severity,
            f"Facture impayée {invoice.number}",
            f"{invoice.customer.name} — solde {invoice.balance}, retard de {days} jours.",
            "customer_invoice", invoice.pk, f"/factures/{invoice.pk}",
        )
    return {"receivable_alerts_created": created}


@shared_task(name="apps.alerts.tasks.generate_purchase_alerts")
def generate_purchase_alerts():
    from apps.core.models import DocumentStatus
    from apps.purchasing.models import PurchaseOrder

    created = 0
    today = timezone.now().date()
    for order in PurchaseOrder.objects.select_related("supplier").filter(
            expected_on__lt=today).exclude(
            status__in=[DocumentStatus.COMPLETED, DocumentStatus.CANCELLED]):
        created += _upsert(
            AlertCode.ORDER_LATE, AlertCategory.SUPPLIER, Urgency.HIGH,
            f"Commande en retard {order.number}",
            f"{order.supplier.name} — livraison attendue le {order.expected_on}.",
            "purchase_order", order.pk, f"/commandes-fournisseurs/{order.pk}",
        )
    return {"purchase_alerts_created": created}


@shared_task(name="apps.alerts.tasks.generate_warranty_alerts")
def generate_warranty_alerts():
    from apps.stock.models import SerialNumber

    created = 0
    today = timezone.now().date()
    horizon = today + timedelta(days=30)
    for serial in SerialNumber.objects.select_related("product", "customer").filter(
            warranty_end__gte=today, warranty_end__lte=horizon):
        created += _upsert(
            AlertCode.WARRANTY_EXPIRING, AlertCategory.WARRANTY, Urgency.MEDIUM,
            f"Garantie expirant : {serial.serial}",
            f"{serial.product.designation} — fin de garantie le {serial.warranty_end}.",
            "serial", serial.pk, f"/numeros-serie/{serial.pk}",
        )
    return {"warranty_alerts_created": created}


@shared_task(name="apps.alerts.tasks.generate_all_alerts")
def generate_all_alerts():
    result = {}
    result.update(generate_stock_alerts())
    result.update(generate_receivable_alerts())
    result.update(generate_purchase_alerts())
    result.update(generate_warranty_alerts())
    return result


@shared_task(name="apps.alerts.tasks.send_receivable_reminders")
def send_receivable_reminders():
    """Relance hebdomadaire des créances échues — section 20."""
    from django.conf import settings
    from django.core.mail import send_mail

    from apps.billing.models import CustomerInvoice, InvoiceStatus

    sent = 0
    today = timezone.now().date()
    for invoice in CustomerInvoice.objects.select_related("customer").filter(
            due_date__lt=today).exclude(
            status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED]):
        if invoice.balance <= 0 or not invoice.customer.email:
            continue
        send_mail(
            subject=f"Relance — facture {invoice.number}",
            message=(f"Bonjour,\n\nLa facture {invoice.number} d'un montant de "
                     f"{invoice.balance} reste impayée depuis {invoice.days_overdue} jours.\n\n"
                     f"Cordialement."),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invoice.customer.email], fail_silently=True,
        )
        sent += 1
    return {"reminders_sent": sent}
