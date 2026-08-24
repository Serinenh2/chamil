"""Facturation, créances et paiements — sections 9, 10, 19 et 20."""
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import (
    DocumentStatus, PaymentMethod, PaymentTerm, TimeStampedModel,
)
from apps.core.numbering import next_number
from apps.partners.models import Customer, Supplier
from apps.purchasing.models import DocumentBase, GoodsReceipt, LineBase, PurchaseOrder
from apps.sales.models import Delivery, SalesOrder


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    PENDING = "pending", _("En attente")
    PARTIAL = "partial", _("Partiellement payée")
    PAID = "paid", _("Payée")
    OVERDUE = "overdue", _("En retard")
    CANCELLED = "cancelled", _("Annulée")


class InvoiceBase(DocumentBase):
    due_date = models.DateField(_("échéance"), null=True, blank=True, db_index=True)
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    paid_amount = models.DecimalField(_("montant payé"), max_digits=14,
                                      decimal_places=2, default=0)
    status = models.CharField(_("statut"), max_length=12, choices=InvoiceStatus.choices,
                              default=InvoiceStatus.DRAFT, db_index=True)

    class Meta(DocumentBase.Meta):
        abstract = True

    @property
    def balance(self):
        """Total facturé – total payé."""
        return self.amount_ttc - self.paid_amount

    @property
    def days_overdue(self):
        if not self.due_date or self.balance <= 0:
            return 0
        delta = (timezone.now().date() - self.due_date).days
        return max(delta, 0)

    @property
    def ageing_bucket(self):
        """Classement des créances — section 20."""
        days = self.days_overdue
        if days == 0:
            return "not_due"
        if days <= 30:
            return "1_30"
        if days <= 60:
            return "31_60"
        if days <= 90:
            return "61_90"
        return "90_plus"

    def refresh_status(self):
        if self.status == InvoiceStatus.CANCELLED:
            return self
        if self.paid_amount >= self.amount_ttc and self.amount_ttc > 0:
            self.status = InvoiceStatus.PAID
        elif self.paid_amount > 0:
            self.status = InvoiceStatus.PARTIAL
        elif self.due_date and self.due_date < timezone.now().date():
            self.status = InvoiceStatus.OVERDUE
        else:
            self.status = InvoiceStatus.PENDING
        self.save(update_fields=["status"])
        return self


class CustomerInvoice(InvoiceBase):
    PREFIX = "FA"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    order = models.ForeignKey(SalesOrder, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="invoices")
    delivery = models.ForeignKey(Delivery, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="invoices")
    stamp_duty = models.DecimalField(_("timbre fiscal"), max_digits=12,
                                     decimal_places=2, default=0)

    class Meta(InvoiceBase.Meta):
        verbose_name = _("facture client")
        verbose_name_plural = _("factures clients")


class CustomerInvoiceLine(LineBase):
    invoice = models.ForeignKey(CustomerInvoice, on_delete=models.CASCADE, related_name="lines")


class SupplierInvoice(InvoiceBase):
    PREFIX = "FF"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="invoices")
    order = models.ForeignKey(PurchaseOrder, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="invoices")
    receipt = models.ForeignKey(GoodsReceipt, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="invoices")
    supplier_reference = models.CharField(_("référence fournisseur"), max_length=40, blank=True)

    class Meta(InvoiceBase.Meta):
        verbose_name = _("facture fournisseur")
        verbose_name_plural = _("factures fournisseurs")


class SupplierInvoiceLine(LineBase):
    invoice = models.ForeignKey(SupplierInvoice, on_delete=models.CASCADE, related_name="lines")


class CreditNote(DocumentBase):
    """Avoir client."""

    PREFIX = "AV"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="credit_notes")
    invoice = models.ForeignKey(CustomerInvoice, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="credit_notes")
    reason = models.CharField(_("motif"), max_length=200, blank=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("avoir")
        verbose_name_plural = _("avoirs")


class CreditNoteLine(LineBase):
    credit_note = models.ForeignKey(CreditNote, on_delete=models.CASCADE, related_name="lines")


class Payment(TimeStampedModel):
    """Règlements clients et fournisseurs — sections 10 et 19."""

    class Direction(models.TextChoices):
        IN = "in", _("Encaissement client")
        OUT = "out", _("Décaissement fournisseur")

    number = models.CharField(_("numéro"), max_length=30, unique=True, db_index=True)
    direction = models.CharField(_("sens"), max_length=3, choices=Direction.choices, db_index=True)
    paid_on = models.DateField(_("date"), default=timezone.now)
    amount = models.DecimalField(_("montant"), max_digits=14, decimal_places=2)
    method = models.CharField(_("mode de paiement"), max_length=10,
                              choices=PaymentMethod.choices, default=PaymentMethod.TRANSFER)
    bank = models.CharField(_("banque"), max_length=120, blank=True)
    reference = models.CharField(_("référence"), max_length=60, blank=True)
    note = models.CharField(_("observation"), max_length=200, blank=True)

    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="payments")
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="payments")
    customer_invoice = models.ForeignKey(CustomerInvoice, null=True, blank=True,
                                         on_delete=models.SET_NULL, related_name="payments")
    supplier_invoice = models.ForeignKey(SupplierInvoice, null=True, blank=True,
                                         on_delete=models.SET_NULL, related_name="payments")

    class Meta:
        ordering = ("-paid_on", "-created_at")
        verbose_name = _("règlement")
        verbose_name_plural = _("règlements")

    def __str__(self):
        return f"{self.number} — {self.amount}"

    def save(self, *args, **kwargs):
        from django.db import transaction

        creating = self._state.adding
        if not self.number:
            self.number = next_number(Payment, "REG")
        with transaction.atomic():
            super().save(*args, **kwargs)
            if creating:
                self._apply_to_invoice()

    def _apply_to_invoice(self):
        """Impute le règlement sur la facture et recalcule son statut."""
        invoice = self.customer_invoice or self.supplier_invoice
        if not invoice:
            return
        invoice.paid_amount = (invoice.paid_amount or 0) + self.amount
        invoice.save(update_fields=["paid_amount"])
        invoice.refresh_status()
