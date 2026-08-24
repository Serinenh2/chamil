"""Journalisation des connexions — alimente l'onglet Sécurité du profil."""
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver

from .models import LoginRecord


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")


@receiver(user_logged_in)
def record_login(sender, request, user, **kwargs):
    LoginRecord.objects.create(
        user=user,
        ip_address=_client_ip(request) if request else None,
        device=(request.META.get("HTTP_USER_AGENT", "")[:200] if request else ""),
        successful=True,
    )


@receiver(user_login_failed)
def record_failure(sender, credentials, request=None, **kwargs):
    from apps.accounts.models import User

    user = User.objects.filter(username=credentials.get("username")).first()
    if user and request:
        LoginRecord.objects.create(
            user=user, ip_address=_client_ip(request),
            device=request.META.get("HTTP_USER_AGENT", "")[:200], successful=False,
        )
