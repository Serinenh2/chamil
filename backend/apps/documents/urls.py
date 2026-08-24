from django.urls import path

from .views import DocumentEmailView, DocumentPDFView

urlpatterns = [
    path("<str:kind>/<int:pk>/pdf/", DocumentPDFView.as_view(), name="document-pdf"),
    path("<str:kind>/<int:pk>/email/", DocumentEmailView.as_view(), name="document-email"),
]
