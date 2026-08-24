from django.db.models import Count
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import BaseModelViewSet

from .models import Alert
from .serializers import AlertSerializer


class AlertViewSet(BaseModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    filterset_fields = ("category", "code", "severity", "is_read", "is_resolved")
    search_fields = ("title", "message")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Compteurs du centre d'alertes, pour la pastille de la barre supérieure."""
        qs = self.queryset.filter(is_resolved=False)
        return Response({
            "total": qs.count(),
            "unread": qs.filter(is_read=False).count(),
            "by_category": list(qs.values("category").annotate(count=Count("id"))),
            "by_severity": list(qs.values("severity").annotate(count=Count("id"))),
        })

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.queryset.filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.is_read = True
        alert.save(update_fields=["is_resolved", "is_read"])
        return Response(self.get_serializer(alert).data)

    @action(detail=False, methods=["post"])
    def regenerate(self, request):
        """Relance manuellement le calcul des alertes."""
        from .tasks import generate_all_alerts

        return Response(generate_all_alerts())
