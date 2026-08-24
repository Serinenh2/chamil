"""Cycle ventes — sections 16 à 18 : devis → commande → livraison."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import DocumentStatus, PaymentTerm
from apps.partners.models import Customer, CustomerContact
from apps.purchasing.models import DocumentBase, LineBase


class Quote(DocumentBase):
    """Devis client — section 16."""

    PREFIX = "DEV"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="quotes")
    contact = models.ForeignKey(CustomerContact, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name="quotes")
    valid_until = models.DateField(_("validité"), null=True, blank=True)
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    lead_time_days = models.PositiveIntegerField(_("délai de livraison (jours)"), default=0)
    sent_at = models.DateTimeField(_("envoyé le"), null=True, blank=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("devis")
        verbose_name_plural = _("devis")


class QuoteLine(LineBase):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="lines")


class SalesOrder(DocumentBase):
    """Commande client — section 17."""

    PREFIX = "CL"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="orders")
    quote = models.ForeignKey(Quote, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="orders")
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    delivery_address = models.TextField(_("adresse de livraison"), blank=True)
    expected_on = models.DateField(_("livraison prévue"), null=True, blank=True)

    class Meta(DocumentBase.Meta):
        verbose_name = _("commande client")
        verbose_name_plural = _("commandes clients")


class SalesOrderLine(LineBase):
    order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="lines")
    delivered_quantity = models.DecimalField(_("quantité livrée"), max_digits=12,
                                             decimal_places=2, default=0)

    @property
    def remaining_quantity(self):
        return self.quantity - self.delivered_quantity


class Delivery(DocumentBase):
    """Bon de livraison — section 18. Décrémente le stock automatiquement."""

    PREFIX = "BL"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="deliveries")
    order = models.ForeignKey(SalesOrder, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="deliveries")
    warehouse = models.ForeignKey("stock.Warehouse", on_delete=models.PROTECT,
                                  related_name="deliveries")
    delivered_on = models.DateField(_("date de livraison"), null=True, blank=True)
    is_partial = models.BooleanField(_("livraison partielle"), default=False)
    received_by = models.CharField(_("réceptionné par"), max_length=120, blank=True)
    signature = models.ImageField(_("signature"), upload_to="deliveries/", blank=True, null=True)
    stock_applied = models.BooleanField(_("stock mis à jour"), default=False)

    class Meta(DocumentBase.Meta):
        verbose_name = _("bon de livraison")
        verbose_name_plural = _("bons de livraison")

    def apply_to_stock(self, user=None):
        from django.db import transaction

        from apps.stock.models import MovementType, StockMovement

        if self.stock_applied:
            return self
        with transaction.atomic():
            for line in self.lines.select_related("product"):
                StockMovement.objects.create(
                    product=line.product, warehouse=self.warehouse,
                    movement_type=MovementType.OUT, quantity=line.quantity,
                    unit_cost=line.product.purchase_price, reference=self.number,
                    created_by=user,
                )
                if self.order_id:
                    order_line = self.order.lines.filter(product=line.product).first()
                    if order_line:
                        order_line.delivered_quantity += line.quantity
                        order_line.save(update_fields=["delivered_quantity"])
            self.stock_applied = True
            self.status = DocumentStatus.VALIDATED
            self.save(update_fields=["stock_applied", "status"])
            if self.order_id:
                remaining = any(l.remaining_quantity > 0 for l in self.order.lines.all())
                self.order.status = (DocumentStatus.PARTIAL if remaining
                                     else DocumentStatus.COMPLETED)
                self.order.save(update_fields=["status"])
        return self


class DeliveryLine(LineBase):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name="lines")
    serial_numbers = models.TextField(_("numéros de série"), blank=True)
