from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def chamil_exception_handler(exc, context):
    """Réponses d'erreur homogènes, exploitables directement par le frontend."""
    if isinstance(exc, DjangoValidationError):
        return Response({"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, IntegrityError):
        return Response(
            {"detail": "Conflit de données : la contrainte d'unicité n'est pas respectée."},
            status=status.HTTP_409_CONFLICT,
        )
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict):
        response.data.setdefault("status_code", response.status_code)
    return response
