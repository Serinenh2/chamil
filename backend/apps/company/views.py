from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsOwnerOrAdmin
from apps.core.viewsets import BaseModelViewSet

from .models import CommercialSettings, Company, LoginRecord, OwnerProfile
from .serializers import (
    CommercialSettingsSerializer, CompanySerializer, LoginRecordSerializer,
    OwnerProfilePublicSerializer, OwnerProfileSerializer,
)


class CompanyViewSet(BaseModelViewSet):
    """Identité légale de l'entreprise."""

    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    read_roles = None  # lecture ouverte à tous les utilisateurs connectés
    write_roles = ("owner", "admin")

    @action(detail=False, methods=["get"])
    def current(self, request):
        company = Company.current()
        if not company:
            return Response({"detail": "Aucune entreprise enregistrée."}, status=404)
        return Response(self.get_serializer(company).data)


class OwnerProfileViewSet(BaseModelViewSet):
    """Données personnelles du dirigeant — section 39.8.

    Toute lecture est journalisée et réservée au dirigeant et à l'administrateur.
    """

    queryset = OwnerProfile.objects.select_related("company", "user")
    permission_classes = [IsOwnerOrAdmin]

    def get_serializer_class(self):
        user = self.request.user
        if user.role in ("owner", "admin"):
            return OwnerProfileSerializer
        return OwnerProfilePublicSerializer

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        profile = OwnerProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({"detail": "Aucun profil dirigeant pour ce compte."}, status=404)
        if request.method == "PATCH":
            s = self.get_serializer(profile, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save(updated_by=request.user)
            return Response(s.data)
        return Response(self.get_serializer(profile).data)

    @action(detail=False, methods=["get"])
    def logins(self, request):
        """Historique des connexions du compte courant."""
        records = LoginRecord.objects.filter(user=request.user)[:50]
        return Response(LoginRecordSerializer(records, many=True).data)


class CommercialSettingsViewSet(BaseModelViewSet):
    """Paramètres par défaut appliqués à toutes les opérations."""

    queryset = CommercialSettings.objects.select_related("company")
    serializer_class = CommercialSettingsSerializer
    read_roles = None
    write_roles = ("owner", "admin")

    @action(detail=False, methods=["get", "patch"])
    def current(self, request):
        settings_obj = CommercialSettings.current()
        if not settings_obj:
            return Response({"detail": "Créer d'abord la fiche entreprise."}, status=404)
        if request.method == "PATCH":
            if request.user.role not in ("owner", "admin"):
                return Response({"detail": "Action réservée au dirigeant."}, status=403)
            s = self.get_serializer(settings_obj, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save(updated_by=request.user)
            return Response(s.data)
        return Response(self.get_serializer(settings_obj).data)
