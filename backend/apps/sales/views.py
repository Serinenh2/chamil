from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import DocumentStatus
from apps.core.viewsets import BaseModelViewSet

from .models import Delivery, Quote, SalesOrder, SalesOrderLine
from .serializers import (
    DeliverySerializer, QuoteListSerializer, QuoteSerializer, SalesOrderSerializer,
)

SALES_ROLES = ("owner", "admin", "sales")


class QuoteViewSet(BaseModelViewSet):
    queryset = Quote.objects.select_related("customer").prefetch_related("lines__product")
    write_roles = SALES_ROLES
    filterset_fields = ("customer", "status")
    search_fields = ("number", "customer__name")
    ordering_fields = ("date", "amount_ttc", "valid_until")

    def get_serializer_class(self):
        return QuoteListSerializer if self.action == "list" else QuoteSerializer

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Envoie le devis au client par e-mail (tâche Celery)."""
        from apps.documents.tasks import email_document

        quote = self.get_object()
        quote.sent_at = timezone.now()
        quote.status = DocumentStatus.PENDING
        quote.save(update_fields=["sent_at", "status"])
        email_document.delay("quote", quote.pk)
        return Response({"detail": f"Devis {quote.number} envoyé."})

    @action(detail=True, methods=["post"])
    def to_order(self, request, pk=None):
        """Devis accepté → commande client (section 16)."""
        quote = self.get_object()
        if quote.orders.exists():
            return Response({"detail": "Devis déjà transformé."}, status=400)
        order = SalesOrder.objects.create(
            customer=quote.customer, quote=quote, payment_term=quote.payment_term,
            status=DocumentStatus.PENDING, created_by=request.user,
        )
        for line in quote.lines.all():
            SalesOrderLine.objects.create(
                order=order, product=line.product, description=line.description,
                quantity=line.quantity, unit_price=line.unit_price,
                discount=line.discount, vat_rate=line.vat_rate)
        order.recompute()
        quote.status = DocumentStatus.VALIDATED
        quote.save(update_fields=["status"])
        return Response(SalesOrderSerializer(order).data, status=201)


class SalesOrderViewSet(BaseModelViewSet):
    queryset = SalesOrder.objects.select_related("customer").prefetch_related("lines__product")
    serializer_class = SalesOrderSerializer
    write_roles = SALES_ROLES
    filterset_fields = ("customer", "status")
    search_fields = ("number", "customer__name")

    @action(detail=True, methods=["post"])
    def recompute_totals(self, request, pk=None):
        return Response(self.get_serializer(self.get_object().recompute()).data)

    @action(detail=True, methods=["post"])
    def to_invoice(self, request, pk=None):
        """Commande livrée → facture client (section 19)."""
        from apps.billing.models import CustomerInvoice, CustomerInvoiceLine

        order = self.get_object()
        invoice = CustomerInvoice.objects.create(
            customer=order.customer, order=order, payment_term=order.payment_term,
            status=DocumentStatus.PENDING, created_by=request.user,
        )
        for line in order.lines.all():
            CustomerInvoiceLine.objects.create(
                invoice=invoice, product=line.product, description=line.description,
                quantity=line.quantity, unit_price=line.unit_price,
                discount=line.discount, vat_rate=line.vat_rate)
        invoice.recompute()
        from apps.billing.serializers import CustomerInvoiceSerializer

        return Response(CustomerInvoiceSerializer(invoice).data, status=201)


class DeliveryViewSet(BaseModelViewSet):
    queryset = Delivery.objects.select_related("customer", "order", "warehouse")
    serializer_class = DeliverySerializer
    write_roles = ("owner", "admin", "sales", "stock")
    filterset_fields = ("customer", "order", "status")
    search_fields = ("number", "customer__name")

    @action(detail=True, methods=["post"])
    def apply_stock(self, request, pk=None):
        """Valide la livraison : sortie de stock + mise à jour de la commande."""
        delivery = self.get_object().apply_to_stock(user=request.user)
        return Response(self.get_serializer(delivery).data)
