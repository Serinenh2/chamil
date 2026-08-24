from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .pdf import TEMPLATES, document_context, render_document_pdf, resolve_document


class DocumentPDFView(APIView):
    """GET /api/v1/documents/<kind>/<pk>/pdf/ — génère le PDF à la volée."""

    permission_classes = [IsAuthenticated]

    def get(self, request, kind, pk):
        if kind not in TEMPLATES:
            return Response({"detail": "Type de document inconnu."}, status=400)
        try:
            document = resolve_document(kind, pk)
        except Exception:
            return Response({"detail": "Document introuvable."}, status=404)

        context = document_context(document, kind)
        context["language"] = request.query_params.get("lang", context["language"])
        pdf = render_document_pdf(TEMPLATES[kind], context,
                                  base_url=request.build_absolute_uri("/"))
        if pdf is None:
            return Response(
                {"detail": "WeasyPrint n'est pas installé sur ce serveur.",
                 "hint": "pip install weasyprint"}, status=501)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{document.number}.pdf"'
        return response


class DocumentEmailView(APIView):
    """POST /api/v1/documents/<kind>/<pk>/email/ — envoi asynchrone."""

    permission_classes = [IsAuthenticated]

    def post(self, request, kind, pk):
        from .tasks import email_document

        recipient = request.data.get("email")
        email_document.delay(kind, pk, recipient)
        return Response({"detail": "Envoi programmé."}, status=202)
