"""Modèles de base réutilisés par tous les modules CHAMIL."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Traçabilité automatique — voir section 35 du cahier des charges."""

    created_at = models.DateTimeField(_("créé le"), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="%(app_label)s_%(class)s_created",
        verbose_name=_("créé par"),
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="%(app_label)s_%(class)s_updated",
        verbose_name=_("modifié par"),
    )

    class Meta:
        abstract = True


class ActivableModel(models.Model):
    is_active = models.BooleanField(_("actif"), default=True, db_index=True)

    class Meta:
        abstract = True


class Wilaya(models.TextChoices):
    """Les 58 wilayas — extrait paramétrable."""

    W16 = "16", _("16 — Alger")
    W31 = "31", _("31 — Oran")
    W25 = "25", _("25 — Constantine")
    W09 = "09", _("09 — Blida")
    W06 = "06", _("06 — Béjaïa")
    W23 = "23", _("23 — Annaba")
    W19 = "19", _("19 — Sétif")
    W05 = "05", _("05 — Batna")
    W15 = "15", _("15 — Tizi Ouzou")
    W35 = "35", _("35 — Boumerdès")


class VatRate(models.TextChoices):
    ZERO = "0.00", _("0 %")
    REDUCED = "9.00", _("9 %")
    NORMAL = "19.00", _("19 %")


class PaymentTerm(models.TextChoices):
    CASH = "cash", _("Comptant")
    D15 = "15", _("15 jours")
    D30 = "30", _("30 jours")
    D45 = "45", _("45 jours")
    D60 = "60", _("60 jours")
    D90 = "90", _("90 jours")


class PaymentMethod(models.TextChoices):
    CASH = "cash", _("Espèces")
    CHECK = "check", _("Chèque")
    TRANSFER = "transfer", _("Virement")
    CARD = "card", _("Carte")
    BILL = "bill", _("Traite")
    OTHER = "other", _("Autre")


class DocumentStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    PENDING = "pending", _("En attente")
    VALIDATED = "validated", _("Validé")
    PARTIAL = "partial", _("Partiel")
    COMPLETED = "completed", _("Terminé")
    CANCELLED = "cancelled", _("Annulé")
    REFUSED = "refused", _("Refusé")


class Urgency(models.TextChoices):
    CRITICAL = "critical", _("Critique")
    HIGH = "high", _("Élevée")
    MEDIUM = "medium", _("Moyenne")
    LOW = "low", _("Faible")
