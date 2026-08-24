"""Journalisation automatique des écritures de l'API."""
from .models import AuditLog

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
ACTION_BY_METHOD = {"POST": AuditLog.Action.CREATE, "PUT": AuditLog.Action.UPDATE,
                    "PATCH": AuditLog.Action.UPDATE, "DELETE": AuditLog.Action.DELETE}


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._log(request, response)
        except Exception:  # la journalisation ne doit jamais casser une requête
            pass
        return response

    @staticmethod
    def _client_ip(request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        return forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")

    def _log(self, request, response):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return
        if request.method not in WRITE_METHODS:
            return
        if not request.path.startswith("/api/") or response.status_code >= 400:
            return
        segments = [s for s in request.path.strip("/").split("/") if s]
        model_name = segments[2] if len(segments) > 2 else "api"
        object_id = segments[3] if len(segments) > 3 and segments[3].isdigit() else ""
        AuditLog.objects.create(
            user=user, action=ACTION_BY_METHOD.get(request.method, AuditLog.Action.UPDATE),
            model_name=model_name, object_id=object_id, path=request.path[:250],
            method=request.method, ip_address=self._client_ip(request),
            device=request.META.get("HTTP_USER_AGENT", "")[:200],
        )
