from rest_framework import viewsets

from .permissions import RolePermission


class BaseModelViewSet(viewsets.ModelViewSet):
    """Renseigne created_by / updated_by et applique les permissions par rôle."""

    permission_classes = [RolePermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
