from datetime import timedelta

from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import BaseModelViewSet

from .models import SerialNumber, StockItem, StockMovement, Warehouse
from .serializers import (
    SerialNumberSerializer, StockItemSerializer, StockMovementSerializer, WarehouseSerializer,
)


class WarehouseViewSet(BaseModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    write_roles = ("owner", "admin", "stock")


class StockItemViewSet(BaseModelViewSet):
    queryset = StockItem.objects.select_related("product", "warehouse")
    serializer_class = StockItemSerializer
    filterset_fields = ("warehouse", "product")
    search_fields = ("product__designation", "product__code")
    write_roles = ("owner", "admin", "stock")

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """Produits sous le seuil minimum ou en rupture — section 30."""
        low = StockItem.objects.select_related("product").filter(
            quantity__lte=F("product__min_stock"))
        return Response({
            "count": low.count(),
            "items": StockItemSerializer(low[:100], many=True).data,
        })

    @action(detail=False, methods=["get"])
    def valuation(self, request):
        """Valorisation du stock au prix d'achat."""
        total = StockItem.objects.aggregate(
            value=Sum(F("quantity") * F("product__purchase_price"))
        )["value"] or 0
        return Response({"stock_value": total, "lines": StockItem.objects.count()})


class StockMovementViewSet(BaseModelViewSet):
    queryset = StockMovement.objects.select_related("product", "warehouse")
    serializer_class = StockMovementSerializer
    filterset_fields = ("product", "warehouse", "movement_type")
    search_fields = ("reference", "product__designation")
    write_roles = ("owner", "admin", "stock")


class SerialNumberViewSet(BaseModelViewSet):
    queryset = SerialNumber.objects.select_related("product", "supplier", "customer")
    serializer_class = SerialNumberSerializer
    filterset_fields = ("status", "product", "supplier", "customer")
    search_fields = ("serial", "product__designation")
    write_roles = ("owner", "admin", "stock", "tech")

    @action(detail=False, methods=["get"])
    def expiring_warranties(self, request):
        """Garanties arrivant à expiration sous 30 jours — section 24."""
        horizon = timezone.now().date() + timedelta(days=30)
        qs = self.queryset.filter(warranty_end__isnull=False,
                                  warranty_end__lte=horizon,
                                  warranty_end__gte=timezone.now().date())
        return Response({"count": qs.count(),
                         "items": SerialNumberSerializer(qs[:100], many=True).data})
