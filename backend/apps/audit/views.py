from rest_framework import viewsets

from apps.core.permissions import IsOwnerOrAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Journal en lecture seule — onglet « Journal d'activité » du profil."""

    queryset = AuditLog.objects.select_related("user")
    serializer_class = AuditLogSerializer
    permission_classes = [IsOwnerOrAdmin]
    filterset_fields = ("user", "action", "model_name")
    search_fields = ("model_name", "object_label", "path")
    ordering_fields = ("created_at",)
