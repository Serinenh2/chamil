from django.db.models import Sum
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import BaseModelViewSet

from .models import CustomerInvoice, InvoiceStatus, Payment, SupplierInvoice
from .serializers import (
    CustomerInvoiceListSerializer, CustomerInvoiceSerializer, PaymentSerializer,
    SupplierInvoiceSerializer,
)

FINANCE_ROLES = ("owner", "admin", "accountant")


class CustomerInvoiceViewSet(BaseModelViewSet):
    queryset = CustomerInvoice.objects.select_related("customer").prefetch_related("lines__product")
    write_roles = FINANCE_ROLES + ("sales",)
    filterset_fields = ("customer", "status")
    search_fields = ("number", "customer__name")
    ordering_fields = ("date", "due_date", "amount_ttc")

    def get_serializer_class(self):
        return (CustomerInvoiceListSerializer if self.action == "list"
                else CustomerInvoiceSerializer)

    @action(detail=True, methods=["post"])
    def recompute_totals(self, request, pk=None):
        invoice = self.get_object().recompute()
        invoice.refresh_status()
        return Response(CustomerInvoiceSerializer(invoice).data)

    @action(detail=False, methods=["get"])
    def receivables(self, request):
        """Créances classées par ancienneté — section 20."""
        buckets = {"not_due": 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0}
        total = 0
        for invoice in self.queryset.exclude(
                status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED]):
            balance = float(invoice.balance)
            if balance <= 0:
                continue
            buckets[invoice.ageing_bucket] += balance
            total += balance
        return Response({"total_receivable": round(total, 2), "buckets": buckets})

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        from apps.documents.tasks import email_document

        invoice = self.get_object()
        email_document.delay("customer_invoice", invoice.pk)
        return Response({"detail": f"Facture {invoice.number} envoyée."})


class SupplierInvoiceViewSet(BaseModelViewSet):
    queryset = SupplierInvoice.objects.select_related("supplier").prefetch_related("lines__product")
    serializer_class = SupplierInvoiceSerializer
    write_roles = FINANCE_ROLES + ("buyer",)
    filterset_fields = ("supplier", "status")
    search_fields = ("number", "supplier__name", "supplier_reference")

    @action(detail=False, methods=["get"])
    def debts(self, request):
        """Dettes fournisseurs : total facturé – total payé (section 10)."""
        agg = self.queryset.exclude(status=InvoiceStatus.CANCELLED).aggregate(
            invoiced=Sum("amount_ttc"), paid=Sum("paid_amount"))
        invoiced, paid = agg["invoiced"] or 0, agg["paid"] or 0
        return Response({"invoiced": invoiced, "paid": paid, "debt": invoiced - paid})


class PaymentViewSet(BaseModelViewSet):
    queryset = Payment.objects.select_related(
        "customer", "supplier", "customer_invoice", "supplier_invoice")
    serializer_class = PaymentSerializer
    write_roles = FINANCE_ROLES
    filterset_fields = ("direction", "method", "customer", "supplier")
    search_fields = ("number", "reference")
    ordering_fields = ("paid_on", "amount")
