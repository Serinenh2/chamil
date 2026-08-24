from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    OWNER = "owner", _("Propriétaire")
    ADMIN = "admin", _("Administrateur")
    SALES = "sales", _("Commercial")
    BUYER = "buyer", _("Acheteur")
    STOCK = "stock", _("Magasinier")
    ACCOUNTANT = "accountant", _("Comptable")
    TECH = "tech", _("Technicien")
    VIEWER = "viewer", _("Consultation")


class User(AbstractUser):
    """Compte utilisateur CHAMIL. Les rôles pilotent toutes les permissions."""

    role = models.CharField(_("rôle"), max_length=20, choices=Role.choices,
                            default=Role.VIEWER, db_index=True)
    phone = models.CharField(_("téléphone"), max_length=30, blank=True)
    avatar = models.ImageField(_("photo"), upload_to="avatars/", blank=True, null=True)
    language = models.CharField(_("langue"), max_length=2,
                                choices=[("fr", "Français"), ("ar", "العربية")], default="fr")
    theme = models.CharField(_("thème"), max_length=6,
                             choices=[("light", _("Clair")), ("dark", _("Sombre"))],
                             default="light")
    two_factor_enabled = models.BooleanField(_("2FA activée"), default=False)
    notify_by_email = models.BooleanField(_("notifications e-mail"), default=True)
    must_change_password = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("utilisateur")
        verbose_name_plural = _("utilisateurs")
        ordering = ("last_name", "first_name")

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_owner(self):
        return self.role == Role.OWNER
