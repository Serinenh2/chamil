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
    """Les wilayas — code géographique national 2021."""

    W01 = "01", _("01 — Adrar")
    W02 = "02", _("02 — Chlef")
    W03 = "03", _("03 — Laghouat")
    W04 = "04", _("04 — Oum El Bouaghi")
    W05 = "05", _("05 — Batna")
    W06 = "06", _("06 — Bejaia")
    W07 = "07", _("07 — Biskra")
    W08 = "08", _("08 — Bechar")
    W09 = "09", _("09 — Blida")
    W10 = "10", _("10 — Bouira")
    W11 = "11", _("11 — Tamenghasset")
    W12 = "12", _("12 — Tebessa")
    W13 = "13", _("13 — Tlemcen")
    W14 = "14", _("14 — Tiaret")
    W15 = "15", _("15 — Tizi Ouzou")
    W16 = "16", _("16 — Alger")
    W17 = "17", _("17 — Djelfa")
    W18 = "18", _("18 — Jijel")
    W19 = "19", _("19 — Setif")
    W20 = "20", _("20 — Saida")
    W21 = "21", _("21 — Skikda")
    W22 = "22", _("22 — Sidi Bel Abbes")
    W23 = "23", _("23 — Annaba")
    W24 = "24", _("24 — Guelma")
    W25 = "25", _("25 — Constantine")
    W26 = "26", _("26 — Medea")
    W27 = "27", _("27 — Mostaganem")
    W28 = "28", _("28 — M'Sila")
    W29 = "29", _("29 — Mascara")
    W30 = "30", _("30 — Ouargla")
    W31 = "31", _("31 — Oran")
    W32 = "32", _("32 — El Bayadh")
    W33 = "33", _("33 — Illizi")
    W34 = "34", _("34 — Bordj Bou Arreridj")
    W35 = "35", _("35 — Boumerdes")
    W36 = "36", _("36 — El Tarf")
    W37 = "37", _("37 — Tindouf")
    W38 = "38", _("38 — Tissemsilt")
    W39 = "39", _("39 — El Oued")
    W40 = "40", _("40 — Khenchela")
    W41 = "41", _("41 — Souk Ahras")
    W42 = "42", _("42 — Tipaza")
    W43 = "43", _("43 — Mila")
    W44 = "44", _("44 — Ain Defla")
    W45 = "45", _("45 — Naama")
    W46 = "46", _("46 — Ain Temouchent")
    W47 = "47", _("47 — Ghardaia")
    W48 = "48", _("48 — Relizane")
    W49 = "49", _("49 — Timimoun")
    W50 = "50", _("50 — Bordj Badji Mokhtar")
    W51 = "51", _("51 — Ouled Djellal")
    W52 = "52", _("52 — Beni Abbes")
    W53 = "53", _("53 — In Salah")
    W54 = "54", _("54 — In Guezzam")
    W55 = "55", _("55 — Touggourt")
    W56 = "56", _("56 — Djanet")
    W57 = "57", _("57 — El Megaier")
    W58 = "58", _("58 — El Meniaa")
    W59 = "59", _("59 — Aflou")
    W60 = "60", _("60 — Barika")
    W61 = "61", _("61 — El Kantara")
    W62 = "62", _("62 — Bir El Ater")
    W63 = "63", _("63 — El Aricha")
    W64 = "64", _("64 — Ksar Chellala")
    W65 = "65", _("65 — Ain Oussera")
    W66 = "66", _("66 — Messaad")
    W67 = "67", _("67 — Ksar El Boukhari")
    W68 = "68", _("68 — Bousaada")
    W69 = "69", _("69 — El Abiodh Sidi Cheikh")


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
