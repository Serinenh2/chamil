"""Section 39 — Page profil : dirigeant, entreprise et paramètres commerciaux."""
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import PaymentTerm, TimeStampedModel, VatRate, Wilaya

# Le format officiel varie selon l'ancienneté du registre (ex : 16/00-1234567B26
# ou 99B0123456) — on valide juste la composition générale, sans imposer un
# gabarit unique qui rejetterait des numéros réels valides.
rc_validator = RegexValidator(
    r"^[A-Za-z0-9/\-]{5,30}$",
    _("Utilisez uniquement chiffres, lettres, « / » et « - »."),
)


class LegalForm(models.TextChoices):
    EURL = "EURL", "EURL"
    SARL = "SARL", "SARL"
    SPA = "SPA", "SPA"
    SNC = "SNC", "SNC"
    ETS = "ETS", _("Établissement")
    OTHER = "OTHER", _("Autre")


class Company(TimeStampedModel):
    """Identité légale de l'entreprise — section 39.2."""

    name = models.CharField(_("raison sociale"), max_length=200)
    name_ar = models.CharField(_("التسمية"), max_length=200, blank=True)
    trade_name = models.CharField(_("nom commercial"), max_length=200, blank=True)
    acronym = models.CharField(_("sigle"), max_length=30, blank=True)
    legal_form = models.CharField(_("forme juridique"), max_length=10,
                                  choices=LegalForm.choices, default=LegalForm.SARL)
    main_activity = models.CharField(_("activité principale"), max_length=200, blank=True)
    other_activities = models.TextField(_("activités secondaires"), blank=True)
    founded_on = models.DateField(_("date de création"), null=True, blank=True)
    capital = models.DecimalField(_("capital social"), max_digits=14, decimal_places=2, default=0)

    rc = models.CharField(_("registre de commerce"), max_length=30, blank=True,
                          validators=[rc_validator])
    nif = models.CharField("NIF", max_length=20, blank=True)
    nis = models.CharField("NIS", max_length=20, blank=True)
    tax_article = models.CharField(_("article d'imposition"), max_length=20, blank=True)
    cnas = models.CharField("CNAS", max_length=20, blank=True)
    casnos = models.CharField("CASNOS", max_length=20, blank=True)

    address = models.TextField(_("adresse du siège"), blank=True)
    wilaya = models.CharField(_("wilaya"), max_length=2, choices=Wilaya.choices, blank=True)
    commune = models.CharField(_("commune"), max_length=100, blank=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    fax = models.CharField(_("fax"), max_length=30, blank=True)
    email = models.EmailField(_("e-mail"), blank=True)
    website = models.URLField(_("site web"), blank=True)
    social_links = models.JSONField(_("réseaux sociaux"), default=dict, blank=True)

    bank = models.CharField(_("banque"), max_length=120, blank=True)
    bank_agency = models.CharField(_("agence"), max_length=120, blank=True)
    rib = models.CharField("RIB", max_length=40, blank=True)

    headcount = models.PositiveIntegerField(_("effectif"), default=0)
    logo = models.ImageField(_("logo"), upload_to="company/", blank=True, null=True)
    stamp = models.ImageField(_("cachet"), upload_to="company/", blank=True, null=True)
    notes = models.TextField(_("observations"), blank=True)

    class Meta:
        verbose_name = _("entreprise")
        verbose_name_plural = _("entreprises")

    def __str__(self):
        return self.name

    @classmethod
    def current(cls):
        """CHAMIL est mono-entreprise : une seule fiche société."""
        return cls.objects.first()


class OwnerProfile(TimeStampedModel):
    """Informations personnelles du propriétaire — section 39.1.

    Données strictement privées : lecture réservée au dirigeant et à
    l'administrateur, jamais reproduites sur un document commercial.
    """

    class Position(models.TextChoices):
        OWNER = "owner", _("Propriétaire")
        MANAGER = "manager", _("Gérant")
        CEO = "ceo", _("PDG")
        PARTNER = "partner", _("Associé")
        DG = "dg", _("Directeur général")

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="owner_profile", verbose_name=_("compte"))
    company = models.ForeignKey(Company, on_delete=models.CASCADE,
                                related_name="owners", verbose_name=_("entreprise"))

    last_name = models.CharField(_("nom"), max_length=100)
    first_name = models.CharField(_("prénom"), max_length=100)
    last_name_ar = models.CharField(_("اللقب"), max_length=100, blank=True)
    first_name_ar = models.CharField(_("الاسم"), max_length=100, blank=True)

    birth_date = models.DateField(_("date de naissance"), null=True, blank=True)
    birth_place = models.CharField(_("lieu de naissance"), max_length=120, blank=True)
    nationality = models.CharField(_("nationalité"), max_length=60, default="Algérienne")
    nin = models.CharField(_("numéro d'identité nationale"), max_length=30, blank=True)
    id_document_type = models.CharField(_("type de pièce"), max_length=60, blank=True)
    id_document_number = models.CharField(_("numéro de pièce"), max_length=40, blank=True)
    id_issued_on = models.DateField(_("date de délivrance"), null=True, blank=True)
    id_expires_on = models.DateField(_("date d'expiration"), null=True, blank=True)

    position = models.CharField(_("qualité"), max_length=10, choices=Position.choices,
                                default=Position.OWNER)
    appointed_on = models.DateField(_("prise de fonction"), null=True, blank=True)
    capital_share = models.DecimalField(_("part du capital (%)"), max_digits=5,
                                        decimal_places=2, default=100)

    address = models.TextField(_("adresse personnelle"), blank=True)
    wilaya = models.CharField(_("wilaya"), max_length=2, choices=Wilaya.choices, blank=True)
    commune = models.CharField(_("commune"), max_length=100, blank=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    mobile = models.CharField(_("mobile"), max_length=30, blank=True)
    personal_email = models.EmailField(_("e-mail personnel"), blank=True)

    signature = models.ImageField(_("signature numérisée"), upload_to="company/private/",
                                  blank=True, null=True)
    notes = models.TextField(_("observations"), blank=True)

    class Meta:
        verbose_name = _("profil du dirigeant")
        verbose_name_plural = _("profils des dirigeants")

    def __str__(self):
        return f"{self.last_name} {self.first_name}"

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name}".strip()

    @property
    def full_name_ar(self):
        return f"{self.last_name_ar} {self.first_name_ar}".strip()

    def masked_nin(self):
        """Le NIN n'est jamais renvoyé en clair dans les listes."""
        return f"•••• •••• •••• {self.nin[-4:]}" if len(self.nin) >= 4 else ""


class DocumentLanguage(models.TextChoices):
    AR = "ar", _("Arabe")
    FR = "fr", _("Français")
    BOTH = "both", _("Bilingue AR / FR")


class CommercialSettings(TimeStampedModel):
    """Paramètres appliqués automatiquement à toutes les opérations — section 39.3."""

    company = models.OneToOneField(Company, on_delete=models.CASCADE,
                                   related_name="settings", verbose_name=_("entreprise"))
    currency = models.CharField(_("devise"), max_length=5, default="DA")
    default_vat_rate = models.DecimalField(_("TVA par défaut"), max_digits=5,
                                           decimal_places=2, default=19,
                                           choices=[(19, "19 %"), (9, "9 %"), (0, "0 %")])
    stamp_duty_rate = models.DecimalField(_("timbre fiscal (%)"), max_digits=5,
                                          decimal_places=2, default=1)
    default_discount = models.DecimalField(_("remise par défaut (%)"), max_digits=5,
                                           decimal_places=2, default=0)
    default_payment_term = models.CharField(_("conditions de paiement"), max_length=10,
                                            choices=PaymentTerm.choices,
                                            default=PaymentTerm.D30)
    default_credit_limit = models.DecimalField(_("plafond de crédit"), max_digits=14,
                                               decimal_places=2, default=0)

    prefix_purchase_request = models.CharField(_("préfixe demande d'achat"), max_length=6, default="DA")
    prefix_supplier_quote = models.CharField(_("préfixe offre fournisseur"), max_length=6, default="OF")
    prefix_purchase_order = models.CharField(_("préfixe commande fournisseur"), max_length=6, default="BC")
    prefix_goods_receipt = models.CharField(_("préfixe bon de réception"), max_length=6, default="BR")
    prefix_quote = models.CharField(_("préfixe devis"), max_length=6, default="DEV")
    prefix_sales_order = models.CharField(_("préfixe commande client"), max_length=6, default="CL")
    prefix_delivery = models.CharField(_("préfixe bon de livraison"), max_length=6, default="BL")
    prefix_invoice = models.CharField(_("préfixe facture"), max_length=6, default="FA")
    prefix_credit_note = models.CharField(_("préfixe avoir"), max_length=6, default="AV")
    prefix_payment = models.CharField(_("préfixe règlement"), max_length=6, default="REG")

    legal_mentions = models.TextField(_("mentions légales"), blank=True)
    invoice_footer = models.TextField(_("pied de page des factures"), blank=True)
    document_language = models.CharField(_("langue des documents"), max_length=5,
                                         choices=DocumentLanguage.choices,
                                         default=DocumentLanguage.BOTH)

    class Meta:
        verbose_name = _("paramètres commerciaux")
        verbose_name_plural = _("paramètres commerciaux")

    def __str__(self):
        return f"Paramètres — {self.company}"

    @classmethod
    def current(cls):
        company = Company.current()
        if not company:
            return None
        settings_obj, _created = cls.objects.get_or_create(company=company)
        return settings_obj


class LoginRecord(TimeStampedModel):
    """Historique des connexions — section 39.5."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="logins")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=200, blank=True)
    successful = models.BooleanField(default=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("connexion")
        verbose_name_plural = _("connexions")
