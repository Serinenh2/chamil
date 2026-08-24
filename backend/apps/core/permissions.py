from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOwnerOrAdmin(BasePermission):
    """Réservé au propriétaire de l'entreprise et à l'administrateur.

    Utilisé pour les données personnelles du dirigeant (section 39.8).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in ("owner", "admin"))


class RolePermission(BasePermission):
    """Permission par rôle déclarée sur la vue.

    class SupplierViewSet(...):
        read_roles = ("owner", "admin", "buyer", "viewer")
        write_roles = ("owner", "admin", "buyer")
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == "owner" or user.is_superuser:
            return True
        roles = getattr(view, "read_roles" if request.method in SAFE_METHODS
                        else "write_roles", None)
        return True if roles is None else user.role in roles


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
