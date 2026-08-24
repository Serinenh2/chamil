"""Journal complet des actions — section 35."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", _("Création")
        UPDATE = "update", _("Modification")
        DELETE = "delete", _("Suppression")
        VALIDATE = "validate", _("Validation")
        CANCEL = "cancel", _("Annulation")
        READ = "read", _("Consultation")
        LOGIN = "login", _("Connexion")

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                             on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(_("opération"), max_length=10, choices=Action.choices,
                              db_index=True)
    model_name = models.CharField(_("objet"), max_length=60, db_index=True)
    object_id = models.CharField(_("identifiant"), max_length=40, blank=True)
    object_label = models.CharField(_("libellé"), max_length=200, blank=True)
    changes = models.JSONField(_("modifications"), default=dict, blank=True)
    path = models.CharField(_("URL"), max_length=250, blank=True)
    method = models.CharField(_("méthode"), max_length=8, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(_("appareil"), max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("entrée de journal")
        verbose_name_plural = _("journal d'activité")

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} — {self.user} — {self.action} {self.model_name}"
