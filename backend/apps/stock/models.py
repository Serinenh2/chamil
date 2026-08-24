"""Stock, mouvements et numéros de série — sections 21, 23 et 24."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import Product
from apps.core.models import TimeStampedModel
from apps.partners.models import Customer, Supplier


class Warehouse(TimeStampedModel):
    code = models.CharField(_("code"), max_length=20, unique=True)
    name = models.CharField(_("désignation"), max_length=120)
    address = models.TextField(_("adresse"), blank=True)
    is_default = models.BooleanField(_("dépôt par défaut"), default=False)

    class Meta:
        ordering = ("name",)
        verbose_name = _("dépôt")
        verbose_name_plural = _("dépôts")

    def __str__(self):
        return self.name


class StockItem(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_items")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="items")
    quantity = models.DecimalField(_("quantité"), max_digits=12, decimal_places=2, default=0)
    location = models.CharField(_("emplacement"), max_length=60, blank=True)

    class Meta:
        unique_together = ("product", "warehouse")
        verbose_name = _("stock")
        verbose_name_plural = _("stocks")

    def __str__(self):
        return f"{self.product} — {self.quantity}"

    @property
    def value(self):
        return self.quantity * self.product.purchase_price


class MovementType(models.TextChoices):
    IN = "in", _("Entrée")
    OUT = "out", _("Sortie")
    ADJUST = "adjust", _("Ajustement")
    RETURN_IN = "return_in", _("Retour client")
    RETURN_OUT = "return_out", _("Retour fournisseur")


class StockMovement(TimeStampedModel):
    """Chaque mouvement est relié au document qui l'a provoqué."""

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(_("type"), max_length=12, choices=MovementType.choices)
    quantity = models.DecimalField(_("quantité"), max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(_("coût unitaire"), max_digits=14, decimal_places=2, default=0)
    reference = models.CharField(_("document"), max_length=40, blank=True, db_index=True)
    note = models.CharField(_("observation"), max_length=200, blank=True)
    moved_at = models.DateTimeField(_("date"), auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-moved_at",)
        verbose_name = _("mouvement de stock")
        verbose_name_plural = _("mouvements de stock")

    def save(self, *args, **kwargs):
        """Applique le mouvement au stock de manière atomique."""
        from django.db import transaction

        with transaction.atomic():
            super().save(*args, **kwargs)
            item, _created = StockItem.objects.select_for_update().get_or_create(
                product=self.product, warehouse=self.warehouse)
            delta = self.quantity
            if self.movement_type in (MovementType.OUT, MovementType.RETURN_OUT):
                delta = -self.quantity
            elif self.movement_type == MovementType.ADJUST:
                item.quantity = self.quantity
                item.save(update_fields=["quantity"])
                return
            item.quantity = models.F("quantity") + delta
            item.save(update_fields=["quantity"])


class SerialNumber(TimeStampedModel):
    """Traçabilité unitaire des équipements — section 23."""

    class Status(models.TextChoices):
        IN_STOCK = "in_stock", _("En stock")
        SOLD = "sold", _("Vendu")
        RETURNED = "returned", _("Retourné")
        SCRAPPED = "scrapped", _("Réformé")

    serial = models.CharField(_("numéro de série"), max_length=80, unique=True, db_index=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="serials")
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="serials")
    purchase_reference = models.CharField(_("facture d'achat"), max_length=40, blank=True)
    purchase_date = models.DateField(_("date d'achat"), null=True, blank=True)
    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="serials")
    sale_reference = models.CharField(_("facture de vente"), max_length=40, blank=True)
    delivery_reference = models.CharField(_("bon de livraison"), max_length=40, blank=True)
    sale_date = models.DateField(_("date de vente"), null=True, blank=True)
    warranty_end = models.DateField(_("fin de garantie"), null=True, blank=True, db_index=True)
    status = models.CharField(_("statut"), max_length=10, choices=Status.choices,
                              default=Status.IN_STOCK, db_index=True)
    notes = models.TextField(_("observations"), blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("numéro de série")
        verbose_name_plural = _("numéros de série")

    def __str__(self):
        return self.serial
