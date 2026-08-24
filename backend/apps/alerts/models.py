"""Centre d'alertes CHAMIL — section 30."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel, Urgency


class AlertCategory(models.TextChoices):
    SUPPLIER = "supplier", _("Fournisseurs")
    CUSTOMER = "customer", _("Clients")
    STOCK = "stock", _("Stock")
    WARRANTY = "warranty", _("Garanties")
    CONTRACT = "contract", _("Contrats")
    TENDER = "tender", _("Marchés")


class AlertCode(models.TextChoices):
    ORDER_LATE = "order_late", _("Commande en retard")
    SUPPLIER_INVOICE_DUE = "supplier_invoice_due", _("Facture fournisseur échue")
    CUSTOMER_INVOICE_OVERDUE = "customer_invoice_overdue", _("Facture client impayée")
    QUOTE_NO_ANSWER = "quote_no_answer", _("Devis sans réponse")
    RECEIVABLE_HIGH = "receivable_high", _("Créance importante")
    STOCK_LOW = "stock_low", _("Stock faible")
    STOCK_OUT = "stock_out", _("Rupture de stock")
    WARRANTY_EXPIRING = "warranty_expiring", _("Garantie proche de l'expiration")


class Alert(TimeStampedModel):
    category = models.CharField(_("catégorie"), max_length=12,
                                choices=AlertCategory.choices, db_index=True)
    code = models.CharField(_("type"), max_length=30, choices=AlertCode.choices, db_index=True)
    severity = models.CharField(_("urgence"), max_length=10, choices=Urgency.choices,
                                default=Urgency.MEDIUM, db_index=True)
    title = models.CharField(_("titre"), max_length=200)
    title_ar = models.CharField(_("العنوان"), max_length=200, blank=True)
    message = models.TextField(_("message"), blank=True)
    message_ar = models.TextField(_("الرسالة"), blank=True)
    entity_type = models.CharField(_("entité"), max_length=40, blank=True)
    entity_id = models.PositiveIntegerField(_("identifiant"), null=True, blank=True)
    link = models.CharField(_("lien"), max_length=200, blank=True)
    is_read = models.BooleanField(_("lue"), default=False, db_index=True)
    is_resolved = models.BooleanField(_("traitée"), default=False, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("alerte")
        verbose_name_plural = _("alertes")
        indexes = [models.Index(fields=["code", "entity_id"])]

    def __str__(self):
        return self.title
