"""Cycle achats — sections 5 à 9 : demande → consultation → commande → réception."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import Product
from apps.core.models import DocumentStatus, PaymentTerm, TimeStampedModel, Urgency
from apps.core.numbering import next_number
from apps.core.totals import document_totals, line_totals
from apps.partners.models import Supplier


class DocumentBase(TimeStampedModel):
    number = models.CharField(_("numéro"), max_length=30, unique=True, db_index=True)
    date = models.DateField(_("date"), auto_now_add=True)
    status = models.CharField(_("statut"), max_length=12, choices=DocumentStatus.choices,
                              default=DocumentStatus.DRAFT, db_index=True)
    amount_ht = models.DecimalField(_("montant HT"), max_digits=14, decimal_places=2, default=0)
    amount_vat = models.DecimalField(_("TVA"), max_digits=14, decimal_places=2, default=0)
    amount_ttc = models.DecimalField(_("montant TTC"), max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(_("observations"), blank=True)

    PREFIX = "DOC"

    class Meta:
        abstract = True
        ordering = ("-created_at",)

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_number(type(self), self.PREFIX)
        super().save(*args, **kwargs)

    def recompute(self):
        ht, vat, ttc = document_totals(self.lines.all())
        self.amount_ht, self.amount_vat, self.amount_ttc = ht, vat, ttc
        self.save(update_fields=["amount_ht", "amount_vat", "amount_ttc", "updated_at"])
        return self


class LineBase(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name=_("produit"))
    description = models.CharField(_("désignation"), max_length=250, blank=True)
    quantity = models.DecimalField(_("quantité"), max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField(_("prix unitaire"), max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(_("remise (%)"), max_digits=5, decimal_places=2, default=0)
    vat_rate = models.DecimalField(_("TVA (%)"), max_digits=5, decimal_places=2, default=19)
    amount_ht = models.DecimalField(_("HT"), max_digits=14, decimal_places=2, default=0)
    amount_vat = models.DecimalField(_("TVA"), max_digits=14, decimal_places=2, default=0)
    amount_ttc = models.DecimalField(_("TTC"), max_digits=14, decimal_places=2, default=0)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.description and self.product_id:
            self.description = self.product.designation
        self.amount_ht, self.amount_vat, self.amount_ttc = line_totals(
            self.quantity, self.unit_price, self.discount, self.vat_rate)
        super().save(*args, **kwargs)


class PurchaseRequest(DocumentBase):
    """Besoin exprimé par un service — section 5."""

    PREFIX = "DA"

    department = models.CharField(_("service"), max_length=120, blank=True)
    urgency = models.CharField(_("urgence"), max_length=10, choices=Urgency.choices,
                               default=Urgency.MEDIUM)
    justification = models.TextField(_("justification"), blank=True)
    needed_on = models.DateField(_("date souhaitée"), null=True, blank=True)
    estimated_budget = models.DecimalField(_("budget estimatif"), max_digits=14,
                                           decimal_places=2, default=0)
    validated_at = models.DateTimeField(_("validée le"), null=True, blank=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("demande d'achat")
        verbose_name_plural = _("demandes d'achat")


class PurchaseRequestLine(LineBase):
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name="lines")


class SupplierQuote(DocumentBase):
    """Offre reçue d'un fournisseur — section 6."""

    PREFIX = "OF"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="quotes")
    request = models.ForeignKey(PurchaseRequest, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="supplier_quotes")
    lead_time_days = models.PositiveIntegerField(_("délai (jours)"), default=0)
    warranty_months = models.PositiveIntegerField(_("garantie (mois)"), default=12)
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    valid_until = models.DateField(_("validité de l'offre"), null=True, blank=True)
    is_available = models.BooleanField(_("produits disponibles"), default=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("offre fournisseur")
        verbose_name_plural = _("offres fournisseurs")


class SupplierQuoteLine(LineBase):
    quote = models.ForeignKey(SupplierQuote, on_delete=models.CASCADE, related_name="lines")


class PurchaseOrder(DocumentBase):
    """Commande fournisseur — section 7."""

    PREFIX = "BC"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="orders")
    quote = models.ForeignKey(SupplierQuote, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="orders")
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    delivery_address = models.TextField(_("adresse de livraison"), blank=True)
    expected_on = models.DateField(_("livraison prévue"), null=True, blank=True)
    responsible = models.CharField(_("responsable"), max_length=120, blank=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("commande fournisseur")
        verbose_name_plural = _("commandes fournisseurs")

    @property
    def is_late(self):
        from django.utils import timezone

        return bool(self.expected_on and self.expected_on < timezone.now().date()
                    and self.status not in (DocumentStatus.COMPLETED, DocumentStatus.CANCELLED))


class PurchaseOrderLine(LineBase):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    received_quantity = models.DecimalField(_("quantité reçue"), max_digits=12,
                                            decimal_places=2, default=0)

    @property
    def remaining_quantity(self):
        return self.quantity - self.received_quantity


class GoodsReceipt(DocumentBase):
    """Bon de réception — section 8. Met le stock à jour automatiquement."""

    PREFIX = "BR"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="receipts")
    order = models.ForeignKey(PurchaseOrder, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="receipts")
    warehouse = models.ForeignKey("stock.Warehouse", on_delete=models.PROTECT,
                                  related_name="receipts")
    received_on = models.DateField(_("date de réception"), null=True, blank=True)
    location = models.CharField(_("emplacement"), max_length=60, blank=True)
    stock_applied = models.BooleanField(_("stock mis à jour"), default=False)

    class Meta(DocumentBase.Meta):
        verbose_name = _("bon de réception")
        verbose_name_plural = _("bons de réception")

    def apply_to_stock(self, user=None):
        """Génère les mouvements d'entrée et met à jour les lignes de commande."""
        from django.db import transaction

        from apps.stock.models import MovementType, StockMovement

        if self.stock_applied:
            return self
        with transaction.atomic():
            for line in self.lines.select_related("product"):
                if line.received_quantity <= 0:
                    continue
                StockMovement.objects.create(
                    product=line.product, warehouse=self.warehouse,
                    movement_type=MovementType.IN, quantity=line.received_quantity,
                    unit_cost=line.unit_price, reference=self.number,
                    created_by=user,
                )
                if self.order_id:
                    order_line = self.order.lines.filter(product=line.product).first()
                    if order_line:
                        order_line.received_quantity += line.received_quantity
                        order_line.save(update_fields=["received_quantity"])
            self.stock_applied = True
            self.status = DocumentStatus.VALIDATED
            self.save(update_fields=["stock_applied", "status"])
            if self.order_id:
                remaining = any(l.remaining_quantity > 0 for l in self.order.lines.all())
                self.order.status = (DocumentStatus.PARTIAL if remaining
                                     else DocumentStatus.COMPLETED)
                self.order.save(update_fields=["status"])
        return self


class GoodsReceiptLine(LineBase):
    receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name="lines")
    ordered_quantity = models.DecimalField(_("quantité commandée"), max_digits=12,
                                           decimal_places=2, default=0)
    received_quantity = models.DecimalField(_("quantité reçue"), max_digits=12,
                                            decimal_places=2, default=0)
    damaged_quantity = models.DecimalField(_("quantité endommagée"), max_digits=12,
                                           decimal_places=2, default=0)
    serial_numbers = models.TextField(_("numéros de série"), blank=True,
                                      help_text=_("Un numéro par ligne."))

    @property
    def missing_quantity(self):
        return self.ordered_quantity - self.received_quantity
