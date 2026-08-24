"""Catalogue produits — référentiel commun aux achats et aux ventes (section 21)."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import ActivableModel, TimeStampedModel
from apps.partners.models import Supplier


class Category(TimeStampedModel):
    name = models.CharField(_("désignation"), max_length=120, unique=True)
    name_ar = models.CharField(_("التسمية"), max_length=120, blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="children")

    class Meta:
        ordering = ("name",)
        verbose_name = _("catégorie")
        verbose_name_plural = _("catégories")

    def __str__(self):
        return self.name


class Brand(TimeStampedModel):
    name = models.CharField(_("marque"), max_length=120, unique=True)

    class Meta:
        ordering = ("name",)
        verbose_name = _("marque")

    def __str__(self):
        return self.name


class Unit(models.TextChoices):
    PIECE = "piece", _("Unité")
    BOX = "box", _("Boîte")
    PACK = "pack", _("Paquet")
    KG = "kg", _("Kilogramme")
    M = "m", _("Mètre")
    L = "l", _("Litre")
    SERVICE = "service", _("Prestation")


class Product(TimeStampedModel, ActivableModel):
    code = models.CharField(_("code"), max_length=30, unique=True, db_index=True)
    designation = models.CharField(_("désignation"), max_length=200, db_index=True)
    designation_ar = models.CharField(_("التسمية"), max_length=200, blank=True)
    description = models.TextField(_("description"), blank=True)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="products")
    brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="products")
    model = models.CharField(_("modèle"), max_length=120, blank=True)
    reference = models.CharField(_("référence"), max_length=120, blank=True)
    unit = models.CharField(_("unité"), max_length=10, choices=Unit.choices, default=Unit.PIECE)

    purchase_price = models.DecimalField(_("prix d'achat"), max_digits=14, decimal_places=2, default=0)
    sale_price = models.DecimalField(_("prix de vente"), max_digits=14, decimal_places=2, default=0)
    vat_rate = models.DecimalField(_("TVA (%)"), max_digits=5, decimal_places=2, default=19)

    min_stock = models.DecimalField(_("seuil minimum"), max_digits=12, decimal_places=2, default=0)
    max_stock = models.DecimalField(_("seuil maximum"), max_digits=12, decimal_places=2, default=0)
    warranty_months = models.PositiveIntegerField(_("garantie (mois)"), default=12)
    has_serial = models.BooleanField(_("suivi par numéro de série"), default=False)
    image = models.ImageField(_("image"), upload_to="products/", blank=True, null=True)

    class Meta:
        ordering = ("designation",)
        verbose_name = _("produit")
        verbose_name_plural = _("produits")

    def __str__(self):
        return f"{self.code} — {self.designation}"

    @property
    def margin(self):
        """Prix de vente – prix d'achat = marge (section 32)."""
        return self.sale_price - self.purchase_price

    @property
    def margin_rate(self):
        if not self.sale_price:
            return 0
        return round(float(self.margin) / float(self.sale_price) * 100, 2)

    @property
    def stock_quantity(self):
        from apps.stock.models import StockItem

        agg = StockItem.objects.filter(product=self).aggregate(total=models.Sum("quantity"))
        return agg["total"] or 0

    @property
    def stock_status(self):
        qty = self.stock_quantity
        if qty <= 0:
            return "out"
        if self.min_stock and qty <= self.min_stock:
            return "low"
        if self.max_stock and qty >= self.max_stock:
            return "over"
        return "ok"


class SupplierProduct(TimeStampedModel):
    """Prix et conditions par fournisseur — permet le comparatif de la section 4."""

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE,
                                 related_name="supplied_products")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="suppliers")
    supplier_reference = models.CharField(_("référence fournisseur"), max_length=120, blank=True)
    price = models.DecimalField(_("prix d'achat"), max_digits=14, decimal_places=2, default=0)
    lead_time_days = models.PositiveIntegerField(_("délai (jours)"), default=0)
    warranty_months = models.PositiveIntegerField(_("garantie (mois)"), default=12)
    is_available = models.BooleanField(_("disponible"), default=True)
    last_purchase_date = models.DateField(_("dernier achat"), null=True, blank=True)
    purchased_quantity = models.DecimalField(_("quantité achetée"), max_digits=12,
                                             decimal_places=2, default=0)
    average_price = models.DecimalField(_("prix moyen"), max_digits=14,
                                        decimal_places=2, default=0)

    class Meta:
        unique_together = ("supplier", "product")
        ordering = ("price",)
        verbose_name = _("produit fournisseur")
        verbose_name_plural = _("produits fournisseurs")

    def __str__(self):
        return f"{self.product} @ {self.supplier}"
