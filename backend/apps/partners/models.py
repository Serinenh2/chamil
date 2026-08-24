"""Fournisseurs et clients — sections 2 à 15 du cahier des charges."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import ActivableModel, PaymentTerm, TimeStampedModel, Wilaya


class PartnerBase(TimeStampedModel, ActivableModel):
    code = models.CharField(_("code"), max_length=20, unique=True)
    name = models.CharField(_("raison sociale"), max_length=200, db_index=True)
    name_ar = models.CharField(_("التسمية"), max_length=200, blank=True)
    trade_name = models.CharField(_("nom commercial"), max_length=200, blank=True)
    legal_form = models.CharField(_("forme juridique"), max_length=30, blank=True)
    activity = models.CharField(_("activité"), max_length=200, blank=True)
    address = models.TextField(_("adresse"), blank=True)
    wilaya = models.CharField(_("wilaya"), max_length=2, choices=Wilaya.choices, blank=True)
    commune = models.CharField(_("commune"), max_length=100, blank=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    email = models.EmailField(_("e-mail"), blank=True)
    website = models.URLField(_("site web"), blank=True)
    rc = models.CharField("RC", max_length=30, blank=True)
    nif = models.CharField("NIF", max_length=20, blank=True)
    nis = models.CharField("NIS", max_length=20, blank=True)
    payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                    choices=PaymentTerm.choices, default=PaymentTerm.D30)
    discount = models.DecimalField(_("remise (%)"), max_digits=5, decimal_places=2, default=0)
    bank = models.CharField(_("banque"), max_length=120, blank=True)
    rib = models.CharField("RIB", max_length=40, blank=True)
    notes = models.TextField(_("observations"), blank=True)

    class Meta:
        abstract = True
        ordering = ("name",)

    def __str__(self):
        return f"{self.code} — {self.name}"


class Supplier(PartnerBase):
    lead_time_days = models.PositiveIntegerField(_("délai de livraison (jours)"), default=0)
    warranty_months = models.PositiveIntegerField(_("garantie (mois)"), default=12)
    score = models.DecimalField(_("score"), max_digits=5, decimal_places=2, default=0,
                                help_text=_("Recalculé automatiquement — section 11."))

    class Meta(PartnerBase.Meta):
        verbose_name = _("fournisseur")
        verbose_name_plural = _("fournisseurs")

    @property
    def total_purchased(self):
        from apps.billing.models import SupplierInvoice

        agg = SupplierInvoice.objects.filter(supplier=self).aggregate(
            total=models.Sum("amount_ttc"), paid=models.Sum("paid_amount"))
        return agg["total"] or 0

    @property
    def debt(self):
        """Total facturé – total payé = dette fournisseur (section 10)."""
        from apps.billing.models import SupplierInvoice

        agg = SupplierInvoice.objects.filter(supplier=self).aggregate(
            total=models.Sum("amount_ttc"), paid=models.Sum("paid_amount"))
        return (agg["total"] or 0) - (agg["paid"] or 0)


class CustomerType(models.TextChoices):
    PUBLIC_ADMIN = "public_admin", _("Administration publique")
    PUBLIC_ESTAB = "public_estab", _("Établissement public")
    PUBLIC_COMPANY = "public_company", _("Entreprise publique")
    PRIVATE = "private", _("Société privée")
    SME = "sme", _("PME")
    LARGE = "large", _("Grande entreprise")
    ASSOCIATION = "association", _("Association")
    PROFESSIONAL = "professional", _("Professionnel")
    INDIVIDUAL = "individual", _("Particulier")
    OTHER = "other", _("Autre")


class Customer(PartnerBase):
    customer_type = models.CharField(_("type"), max_length=20, choices=CustomerType.choices,
                                     default=CustomerType.PRIVATE, db_index=True)
    credit_limit = models.DecimalField(_("plafond de crédit"), max_digits=14,
                                       decimal_places=2, default=0)

    class Meta(PartnerBase.Meta):
        verbose_name = _("client")
        verbose_name_plural = _("clients")

    @property
    def receivable(self):
        """Total facturé – total payé = créance client (section 20)."""
        from apps.billing.models import CustomerInvoice

        agg = CustomerInvoice.objects.filter(customer=self).exclude(
            status="cancelled").aggregate(
            total=models.Sum("amount_ttc"), paid=models.Sum("paid_amount"))
        return (agg["total"] or 0) - (agg["paid"] or 0)


class ContactBase(TimeStampedModel):
    last_name = models.CharField(_("nom"), max_length=100)
    first_name = models.CharField(_("prénom"), max_length=100, blank=True)
    job_title = models.CharField(_("fonction"), max_length=120, blank=True)
    department = models.CharField(_("service"), max_length=120, blank=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    mobile = models.CharField(_("mobile"), max_length=30, blank=True)
    email = models.EmailField(_("e-mail"), blank=True)
    is_commercial = models.BooleanField(_("contact commercial"), default=False)
    is_technical = models.BooleanField(_("contact technique"), default=False)
    is_financial = models.BooleanField(_("contact financier"), default=False)
    is_management = models.BooleanField(_("contact direction"), default=False)

    class Meta:
        abstract = True
        ordering = ("last_name", "first_name")

    def __str__(self):
        return f"{self.last_name} {self.first_name}".strip()


class SupplierContact(ContactBase):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="contacts")


class CustomerContact(ContactBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="contacts")


class SupplierEvaluation(TimeStampedModel):
    """Évaluation multicritère du fournisseur — section 11."""

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="evaluations")
    period = models.CharField(_("période"), max_length=20)
    price = models.PositiveSmallIntegerField(_("prix"), default=0)
    quality = models.PositiveSmallIntegerField(_("qualité"), default=0)
    availability = models.PositiveSmallIntegerField(_("disponibilité"), default=0)
    lead_time = models.PositiveSmallIntegerField(_("délai"), default=0)
    order_compliance = models.PositiveSmallIntegerField(_("respect des commandes"), default=0)
    service = models.PositiveSmallIntegerField(_("qualité de service"), default=0)
    warranty = models.PositiveSmallIntegerField(_("respect des garanties"), default=0)
    payment_conditions = models.PositiveSmallIntegerField(_("conditions de paiement"), default=0)
    comment = models.TextField(_("commentaire"), blank=True)

    CRITERIA = ("price", "quality", "availability", "lead_time",
                "order_compliance", "service", "warranty", "payment_conditions")

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("évaluation fournisseur")
        verbose_name_plural = _("évaluations fournisseurs")

    @property
    def global_score(self):
        values = [getattr(self, c) for c in self.CRITERIA]
        return round(sum(values) / len(values), 2)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.supplier.score = self.global_score
        self.supplier.save(update_fields=["score"])


class Prospect(TimeStampedModel):
    """PROSPECT → OPPORTUNITÉ → DEVIS → COMMANDE → CLIENT (section 15)."""

    class Stage(models.TextChoices):
        NEW = "new", _("Nouveau")
        OPPORTUNITY = "opportunity", _("Opportunité")
        QUOTED = "quoted", _("Devis envoyé")
        NEGOTIATION = "negotiation", _("Négociation")
        WON = "won", _("Converti en client")
        LOST = "lost", _("Perdu")

    name = models.CharField(_("dénomination"), max_length=200)
    source = models.CharField(_("source"), max_length=120, blank=True)
    need = models.TextField(_("besoin"), blank=True)
    potential = models.DecimalField(_("potentiel estimé"), max_digits=14,
                                    decimal_places=2, default=0)
    stage = models.CharField(_("étape"), max_length=15, choices=Stage.choices,
                             default=Stage.NEW, db_index=True)
    probability = models.PositiveSmallIntegerField(_("probabilité (%)"), default=0)
    next_action = models.CharField(_("prochaine action"), max_length=200, blank=True)
    next_action_date = models.DateField(_("date de relance"), null=True, blank=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    email = models.EmailField(_("e-mail"), blank=True)
    converted_customer = models.OneToOneField(Customer, null=True, blank=True,
                                              on_delete=models.SET_NULL,
                                              related_name="origin_prospect")

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("prospect")
        verbose_name_plural = _("prospects")

    def __str__(self):
        return self.name
