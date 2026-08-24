from django.db.models import Count, Sum
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import BaseModelViewSet

from .models import (
    Customer, CustomerContact, Prospect, Supplier, SupplierContact, SupplierEvaluation,
)
from .serializers import (
    CustomerContactSerializer, CustomerListSerializer, CustomerSerializer,
    ProspectSerializer, SupplierContactSerializer, SupplierEvaluationSerializer,
    SupplierListSerializer, SupplierSerializer,
)


class SupplierViewSet(BaseModelViewSet):
    queryset = Supplier.objects.prefetch_related("contacts")
    read_roles = None
    write_roles = ("owner", "admin", "buyer")
    search_fields = ("code", "name", "trade_name", "rc", "nif", "phone", "email")
    filterset_fields = ("wilaya", "is_active", "payment_term")
    ordering_fields = ("name", "code", "score", "created_at")

    def get_serializer_class(self):
        return SupplierListSerializer if self.action == "list" else SupplierSerializer

    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """Produits fournis, prix et délais — section 4."""
        from apps.catalog.serializers import SupplierProductSerializer

        supplier = self.get_object()
        qs = supplier.supplied_products.select_related("product")
        return Response(SupplierProductSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def statement(self, request, pk=None):
        """Situation financière : facturé, payé, dette."""
        from apps.billing.models import SupplierInvoice

        supplier = self.get_object()
        agg = SupplierInvoice.objects.filter(supplier=supplier).aggregate(
            invoiced=Sum("amount_ttc"), paid=Sum("paid_amount"), count=Count("id"))
        invoiced, paid = agg["invoiced"] or 0, agg["paid"] or 0
        return Response({
            "supplier": supplier.name, "invoice_count": agg["count"],
            "invoiced": invoiced, "paid": paid, "debt": invoiced - paid,
        })


class CustomerViewSet(BaseModelViewSet):
    queryset = Customer.objects.prefetch_related("contacts")
    read_roles = None
    write_roles = ("owner", "admin", "sales")
    search_fields = ("code", "name", "trade_name", "rc", "nif", "phone", "email")
    filterset_fields = ("customer_type", "wilaya", "is_active")
    ordering_fields = ("name", "code", "created_at")

    def get_serializer_class(self):
        return CustomerListSerializer if self.action == "list" else CustomerSerializer

    @action(detail=True, methods=["get"])
    def overview(self, request, pk=None):
        """Fiche client 360° — section 13."""
        from apps.billing.models import CustomerInvoice
        from apps.sales.models import Quote, SalesOrder

        customer = self.get_object()
        invoices = CustomerInvoice.objects.filter(customer=customer).exclude(status="cancelled")
        agg = invoices.aggregate(invoiced=Sum("amount_ttc"), paid=Sum("paid_amount"))
        invoiced, paid = agg["invoiced"] or 0, agg["paid"] or 0
        return Response({
            "customer": CustomerSerializer(customer).data,
            "quotes": Quote.objects.filter(customer=customer).count(),
            "orders": SalesOrder.objects.filter(customer=customer).count(),
            "invoices": invoices.count(),
            "revenue": invoiced, "paid": paid, "receivable": invoiced - paid,
            "credit_limit": customer.credit_limit,
            "credit_exceeded": (invoiced - paid) > customer.credit_limit > 0,
        })


class SupplierContactViewSet(BaseModelViewSet):
    queryset = SupplierContact.objects.select_related("supplier")
    serializer_class = SupplierContactSerializer
    filterset_fields = ("supplier",)
    write_roles = ("owner", "admin", "buyer")


class CustomerContactViewSet(BaseModelViewSet):
    queryset = CustomerContact.objects.select_related("customer")
    serializer_class = CustomerContactSerializer
    filterset_fields = ("customer",)
    write_roles = ("owner", "admin", "sales")


class SupplierEvaluationViewSet(BaseModelViewSet):
    queryset = SupplierEvaluation.objects.select_related("supplier")
    serializer_class = SupplierEvaluationSerializer
    filterset_fields = ("supplier",)
    write_roles = ("owner", "admin", "buyer")


class ProspectViewSet(BaseModelViewSet):
    queryset = Prospect.objects.all()
    serializer_class = ProspectSerializer
    filterset_fields = ("stage",)
    search_fields = ("name", "need", "source")
    write_roles = ("owner", "admin", "sales")

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Transforme le prospect en client (section 15)."""
        from apps.core.numbering import next_number

        prospect = self.get_object()
        if prospect.converted_customer:
            return Response({"detail": "Prospect déjà converti."}, status=400)
        customer = Customer.objects.create(
            code=next_number(Customer, "CLI", field="code", width=5).replace("CLI-", "CLI"),
            name=prospect.name, phone=prospect.phone, email=prospect.email,
            created_by=request.user,
        )
        prospect.converted_customer = customer
        prospect.stage = Prospect.Stage.WON
        prospect.save(update_fields=["converted_customer", "stage"])
        return Response(CustomerSerializer(customer).data, status=201)
