from django.urls import path

from .views import DocumentEmailView, DocumentPDFView, DocumentWordView

urlpatterns = [
    path("<str:kind>/<int:pk>/pdf/", DocumentPDFView.as_view(), name="document-pdf"),
    path("<str:kind>/<int:pk>/word/", DocumentWordView.as_view(), name="document-word"),
    path("<str:kind>/<int:pk>/email/", DocumentEmailView.as_view(), name="document-email"),
]
