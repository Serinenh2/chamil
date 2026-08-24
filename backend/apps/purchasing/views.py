from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import DocumentStatus
from apps.core.viewsets import BaseModelViewSet

from .models import GoodsReceipt, PurchaseOrder, PurchaseRequest, SupplierQuote
from .serializers import (
    GoodsReceiptSerializer, PurchaseOrderListSerializer, PurchaseOrderSerializer,
    PurchaseRequestSerializer, SupplierQuoteSerializer,
)

BUYER_ROLES = ("owner", "admin", "buyer")


class PurchaseRequestViewSet(BaseModelViewSet):
    queryset = PurchaseRequest.objects.prefetch_related("lines__product")
    serializer_class = PurchaseRequestSerializer
    write_roles = BUYER_ROLES
    filterset_fields = ("status", "urgency")
    search_fields = ("number", "department", "justification")

    @action(detail=True, methods=["post"])
    def validate_request(self, request, pk=None):
        obj = self.get_object()
        obj.status = DocumentStatus.VALIDATED
        obj.validated_at = timezone.now()
        obj.save(update_fields=["status", "validated_at"])
        return Response(self.get_serializer(obj).data)


class SupplierQuoteViewSet(BaseModelViewSet):
    queryset = SupplierQuote.objects.select_related("supplier").prefetch_related("lines__product")
    serializer_class = SupplierQuoteSerializer
    write_roles = BUYER_ROLES
    filterset_fields = ("supplier", "status", "request")
    search_fields = ("number", "supplier__name")

    @action(detail=False, methods=["get"])
    def comparison(self, request):
        """Tableau comparatif des offres reçues pour une demande — section 6."""
        request_id = request.query_params.get("request")
        if not request_id:
            return Response({"detail": "Paramètre `request` obligatoire."}, status=400)
        quotes = self.queryset.filter(request_id=request_id)
        rows = [{
            "quote": q.number, "supplier": q.supplier.name, "amount_ht": q.amount_ht,
            "amount_ttc": q.amount_ttc, "lead_time_days": q.lead_time_days,
            "warranty_months": q.warranty_months, "payment_term": q.get_payment_term_display(),
            "valid_until": q.valid_until, "available": q.is_available,
        } for q in quotes]
        best = min(rows, key=lambda r: r["amount_ttc"]) if rows else None
        fastest = min(rows, key=lambda r: r["lead_time_days"]) if rows else None
        return Response({"offers": rows,
                         "best_price": best["supplier"] if best else None,
                         "shortest_lead_time": fastest["supplier"] if fastest else None})

    @action(detail=True, methods=["post"])
    def to_order(self, request, pk=None):
        """Offre validée → commande fournisseur (section 7)."""
        from .models import PurchaseOrderLine

        quote = self.get_object()
        order = PurchaseOrder.objects.create(
            supplier=quote.supplier, quote=quote, payment_term=quote.payment_term,
            created_by=request.user, status=DocumentStatus.PENDING,
        )
        for line in quote.lines.all():
            PurchaseOrderLine.objects.create(
                order=order, product=line.product, description=line.description,
                quantity=line.quantity, unit_price=line.unit_price,
                discount=line.discount, vat_rate=line.vat_rate)
        order.recompute()
        quote.status = DocumentStatus.VALIDATED
        quote.save(update_fields=["status"])
        return Response(PurchaseOrderSerializer(order).data, status=201)


class PurchaseOrderViewSet(BaseModelViewSet):
    queryset = PurchaseOrder.objects.select_related("supplier").prefetch_related("lines__product")
    write_roles = BUYER_ROLES
    filterset_fields = ("supplier", "status")
    search_fields = ("number", "supplier__name")
    ordering_fields = ("date", "amount_ttc", "expected_on")

    def get_serializer_class(self):
        return PurchaseOrderListSerializer if self.action == "list" else PurchaseOrderSerializer

    @action(detail=True, methods=["post"])
    def recompute_totals(self, request, pk=None):
        return Response(self.get_serializer(self.get_object().recompute()).data)

    @action(detail=False, methods=["get"])
    def late(self, request):
        today = timezone.now().date()
        qs = self.queryset.filter(expected_on__lt=today).exclude(
            status__in=[DocumentStatus.COMPLETED, DocumentStatus.CANCELLED])
        return Response(PurchaseOrderListSerializer(qs, many=True).data)


class GoodsReceiptViewSet(BaseModelViewSet):
    queryset = GoodsReceipt.objects.select_related("supplier", "order", "warehouse")
    serializer_class = GoodsReceiptSerializer
    write_roles = ("owner", "admin", "buyer", "stock")
    filterset_fields = ("supplier", "order", "warehouse", "status")
    search_fields = ("number",)

    @action(detail=True, methods=["post"])
    def apply_stock(self, request, pk=None):
        """Valide la réception : entrée en stock + mise à jour de la commande."""
        receipt = self.get_object().apply_to_stock(user=request.user)
        return Response(self.get_serializer(receipt).data)
