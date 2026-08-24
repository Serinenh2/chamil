from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.permissions import IsOwnerOrAdmin

from .models import User
from .serializers import (
    ChamilTokenSerializer, PasswordChangeSerializer, PreferencesSerializer,
    UserCreateSerializer, UserSerializer,
)


class ChamilTokenView(TokenObtainPairView):
    serializer_class = ChamilTokenSerializer


class UserViewSet(viewsets.ModelViewSet):
    """Gestion des utilisateurs — réservée au propriétaire et à l'administrateur."""

    queryset = User.objects.all()
    permission_classes = [IsOwnerOrAdmin]
    search_fields = ("username", "first_name", "last_name", "email")
    filterset_fields = ("role", "is_active")

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == "create" else UserSerializer

    def get_permissions(self):
        if self.action in ("me", "preferences", "change_password", "logout"):
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        if request.method == "PATCH":
            s = UserSerializer(request.user, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data)
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["get", "patch"])
    def preferences(self, request):
        if request.method == "PATCH":
            s = PreferencesSerializer(request.user, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data)
        return Response(PreferencesSerializer(request.user).data)

    @action(detail=False, methods=["post"], url_path="change-password")
    def change_password(self, request):
        s = PasswordChangeSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response({"detail": "Mot de passe modifié."})

    @action(detail=False, methods=["post"])
    def logout(self, request):
        """Invalide le jeton de rafraîchissement (liste noire)."""
        token = request.data.get("refresh")
        if not token:
            return Response({"detail": "Jeton manquant."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(token).blacklist()
        except Exception:
            return Response({"detail": "Jeton invalide."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Déconnecté."})

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"detail": "Compte suspendu."})
