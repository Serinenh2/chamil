"""Tâches Celery : génération et envoi des documents."""
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage


@shared_task(name="apps.documents.tasks.email_document", bind=True, max_retries=3)
def email_document(self, kind, pk, recipient=None):
    """Génère le PDF puis l'envoie en pièce jointe."""
    from .pdf import TEMPLATES, document_context, render_document_pdf, resolve_document

    try:
        document = resolve_document(kind, pk)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

    partner = getattr(document, "customer", None) or getattr(document, "supplier", None)
    to = recipient or getattr(partner, "email", "")
    if not to:
        return {"sent": False, "reason": "Aucune adresse e-mail disponible."}

    context = document_context(document, kind)
    pdf = render_document_pdf(TEMPLATES[kind], context)

    subject = f"{document.number} — {getattr(settings, 'DEFAULT_FROM_EMAIL', 'CHAMIL')}"
    body = (f"Bonjour,\n\nVeuillez trouver ci-joint le document {document.number}.\n\n"
            f"Cordialement,\n{context['company'].name if context['company'] else 'CHAMIL'}")
    message = EmailMessage(subject, body, settings.DEFAULT_FROM_EMAIL, [to])
    if pdf:
        message.attach(f"{document.number}.pdf", pdf, "application/pdf")
    message.send(fail_silently=False)
    return {"sent": True, "to": to, "document": document.number}
