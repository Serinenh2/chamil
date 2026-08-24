from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import BaseModelViewSet

from .models import Brand, Category, Product, SupplierProduct
from .serializers import (
    BrandSerializer, CategorySerializer, ProductListSerializer, ProductSerializer,
    SupplierProductSerializer,
)


class CategoryViewSet(BaseModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ("name",)
    write_roles = ("owner", "admin", "buyer", "stock")


class BrandViewSet(BaseModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    search_fields = ("name",)
    write_roles = ("owner", "admin", "buyer", "stock")


class ProductViewSet(BaseModelViewSet):
    queryset = Product.objects.select_related("category", "brand").prefetch_related("suppliers")
    read_roles = None
    write_roles = ("owner", "admin", "buyer", "stock")
    search_fields = ("code", "designation", "designation_ar", "reference", "model")
    filterset_fields = ("category", "brand", "is_active", "has_serial")
    ordering_fields = ("designation", "code", "sale_price", "purchase_price")

    def get_serializer_class(self):
        return ProductListSerializer if self.action == "list" else ProductSerializer

    @action(detail=True, methods=["get"])
    def compare_suppliers(self, request, pk=None):
        """Tableau comparatif des offres fournisseurs — section 4."""
        product = self.get_object()
        offers = product.suppliers.select_related("supplier").filter(is_available=True)
        data = SupplierProductSerializer(offers, many=True).data
        best = min(data, key=lambda o: float(o["price"]), default=None) if data else None
        return Response({
            "product": product.designation,
            "offers": data,
            "best_price_supplier": best["supplier_name"] if best else None,
            "best_price": best["price"] if best else None,
        })

    @action(detail=True, methods=["get"])
    def traceability(self, request, pk=None):
        """Chaîne complète du produit — section 22."""
        from apps.billing.models import CustomerInvoice
        from apps.purchasing.models import PurchaseOrderLine
        from apps.sales.models import SalesOrderLine

        product = self.get_object()
        purchases = PurchaseOrderLine.objects.filter(product=product).select_related(
            "order", "order__supplier")[:20]
        sales = SalesOrderLine.objects.filter(product=product).select_related(
            "order", "order__customer")[:20]
        return Response({
            "product": product.designation,
            "stock": product.stock_quantity,
            "purchases": [
                {"order": l.order.number, "supplier": l.order.supplier.name,
                 "quantity": l.quantity, "unit_price": l.unit_price, "date": l.order.date}
                for l in purchases
            ],
            "sales": [
                {"order": l.order.number, "customer": l.order.customer.name,
                 "quantity": l.quantity, "unit_price": l.unit_price, "date": l.order.date}
                for l in sales
            ],
            "invoices": list(
                CustomerInvoice.objects.filter(lines__product=product)
                .values_list("number", flat=True).distinct()[:20]
            ),
        })


class SupplierProductViewSet(BaseModelViewSet):
    queryset = SupplierProduct.objects.select_related("supplier", "product")
    serializer_class = SupplierProductSerializer
    filterset_fields = ("supplier", "product", "is_available")
    write_roles = ("owner", "admin", "buyer")
