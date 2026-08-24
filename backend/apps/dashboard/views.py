"""Tableaux de bord achats, ventes et global — sections 28, 29, 31, 32 et 33."""
from datetime import timedelta

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _money(value):
    return float(value or 0)


class PurchasingDashboardView(APIView):
    """Tableau de bord ACHATS — section 28."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.billing.models import InvoiceStatus, SupplierInvoice
        from apps.core.models import DocumentStatus
        from apps.partners.models import Supplier
        from apps.purchasing.models import PurchaseOrder

        today = timezone.now().date()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)
        orders = PurchaseOrder.objects.exclude(status=DocumentStatus.CANCELLED)
        invoices = SupplierInvoice.objects.exclude(status=InvoiceStatus.CANCELLED)
        agg = invoices.aggregate(total=Sum("amount_ttc"), paid=Sum("paid_amount"))

        best = list(
            invoices.values("supplier__name")
            .annotate(total=Sum("amount_ttc")).order_by("-total")[:5]
        )
        return Response({
            "purchases_today": _money(orders.filter(date=today).aggregate(s=Sum("amount_ttc"))["s"]),
            "purchases_month": _money(orders.filter(date__gte=month_start).aggregate(s=Sum("amount_ttc"))["s"]),
            "purchases_year": _money(orders.filter(date__gte=year_start).aggregate(s=Sum("amount_ttc"))["s"]),
            "active_suppliers": Supplier.objects.filter(is_active=True).count(),
            "open_orders": orders.exclude(status=DocumentStatus.COMPLETED).count(),
            "late_orders": orders.filter(expected_on__lt=today).exclude(
                status=DocumentStatus.COMPLETED).count(),
            "supplier_invoices": invoices.count(),
            "supplier_debt": _money(agg["total"]) - _money(agg["paid"]),
            "top_suppliers": [
                {"name": r["supplier__name"], "total": _money(r["total"])} for r in best
            ],
        })


class SalesDashboardView(APIView):
    """Tableau de bord VENTES — section 29."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.billing.models import CustomerInvoice, InvoiceStatus
        from apps.core.models import DocumentStatus
        from apps.partners.models import Customer
        from apps.sales.models import Quote, SalesOrder

        today = timezone.now().date()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)
        invoices = CustomerInvoice.objects.exclude(status=InvoiceStatus.CANCELLED)
        agg = invoices.aggregate(total=Sum("amount_ttc"), paid=Sum("paid_amount"))

        best = list(
            invoices.values("customer__name")
            .annotate(total=Sum("amount_ttc")).order_by("-total")[:5]
        )
        top_products = list(
            invoices.values("lines__product__designation")
            .annotate(qty=Sum("lines__quantity"), revenue=Sum("lines__amount_ht"))
            .exclude(lines__product__isnull=True).order_by("-revenue")[:5]
        )
        return Response({
            "revenue_today": _money(invoices.filter(date=today).aggregate(s=Sum("amount_ttc"))["s"]),
            "revenue_month": _money(invoices.filter(date__gte=month_start).aggregate(s=Sum("amount_ttc"))["s"]),
            "revenue_year": _money(invoices.filter(date__gte=year_start).aggregate(s=Sum("amount_ttc"))["s"]),
            "new_customers": Customer.objects.filter(created_at__date__gte=month_start).count(),
            "pending_quotes": Quote.objects.filter(status=DocumentStatus.PENDING).count(),
            "open_orders": SalesOrder.objects.exclude(
                status__in=[DocumentStatus.COMPLETED, DocumentStatus.CANCELLED]).count(),
            "unpaid_invoices": invoices.exclude(status=InvoiceStatus.PAID).count(),
            "receivables": _money(agg["total"]) - _money(agg["paid"]),
            "top_customers": [
                {"name": r["customer__name"], "total": _money(r["total"])} for r in best
            ],
            "top_products": [
                {"name": r["lines__product__designation"], "quantity": _money(r["qty"]),
                 "revenue": _money(r["revenue"])} for r in top_products
            ],
        })


class GlobalDashboardView(APIView):
    """Tableau de bord unique du dirigeant — section 31."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.alerts.models import Alert
        from apps.billing.models import CustomerInvoice, InvoiceStatus, SupplierInvoice
        from apps.core.models import DocumentStatus
        from apps.partners.models import Customer, Supplier
        from apps.sales.models import Delivery, Quote, SalesOrder
        from apps.stock.models import StockItem

        customer_agg = CustomerInvoice.objects.exclude(
            status=InvoiceStatus.CANCELLED).aggregate(
            total=Sum("amount_ttc"), paid=Sum("paid_amount"))
        supplier_agg = SupplierInvoice.objects.exclude(
            status=InvoiceStatus.CANCELLED).aggregate(
            total=Sum("amount_ttc"), paid=Sum("paid_amount"))
        stock_value = StockItem.objects.aggregate(
            v=Sum(F("quantity") * F("product__purchase_price")))["v"]

        return Response({
            "purchases": {
                "amount": _money(supplier_agg["total"]),
                "suppliers": Supplier.objects.filter(is_active=True).count(),
                "open_orders": SalesOrder.objects.none().count(),
                "debt": _money(supplier_agg["total"]) - _money(supplier_agg["paid"]),
            },
            "sales": {
                "revenue": _money(customer_agg["total"]),
                "customers": Customer.objects.filter(is_active=True).count(),
                "receivables": _money(customer_agg["total"]) - _money(customer_agg["paid"]),
            },
            "stock": {
                "value": _money(stock_value),
                "out_of_stock": StockItem.objects.filter(quantity__lte=0).count(),
                "low_stock": StockItem.objects.filter(
                    quantity__lte=F("product__min_stock"), quantity__gt=0).count(),
            },
            "activity": {
                "quotes": Quote.objects.count(),
                "orders": SalesOrder.objects.count(),
                "deliveries": Delivery.objects.count(),
                "invoices": CustomerInvoice.objects.count(),
            },
            "alerts": {
                "open": Alert.objects.filter(is_resolved=False).count(),
                "critical": Alert.objects.filter(is_resolved=False, severity="critical").count(),
            },
        })


class MonthlyTrendView(APIView):
    """Série achats / ventes sur 12 mois — alimente les graphiques Recharts."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.billing.models import CustomerInvoice, InvoiceStatus, SupplierInvoice

        months = int(request.query_params.get("months", 6))
        start = (timezone.now().date() - timedelta(days=31 * months)).replace(day=1)

        def series(model):
            rows = (model.objects.exclude(status=InvoiceStatus.CANCELLED)
                    .filter(date__gte=start)
                    .annotate(m=TruncMonth("date")).values("m")
                    .annotate(total=Sum("amount_ttc")).order_by("m"))
            return {r["m"].strftime("%Y-%m"): _money(r["total"]) for r in rows}

        sales, purchases = series(CustomerInvoice), series(SupplierInvoice)
        labels = sorted(set(sales) | set(purchases))
        return Response([
            {"month": m, "sales": sales.get(m, 0), "purchases": purchases.get(m, 0)}
            for m in labels
        ])


class ProfitabilityView(APIView):
    """Analyse de rentabilité — section 32."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.billing.models import CustomerInvoiceLine

        rows = (CustomerInvoiceLine.objects
                .exclude(invoice__status="cancelled")
                .values("product__id", "product__designation",
                        "product__purchase_price")
                .annotate(quantity=Sum("quantity"), revenue=Sum("amount_ht"))
                .order_by("-revenue")[:50])
        data = []
        for r in rows:
            cost = _money(r["product__purchase_price"]) * _money(r["quantity"])
            revenue = _money(r["revenue"])
            data.append({
                "product_id": r["product__id"], "product": r["product__designation"],
                "quantity": _money(r["quantity"]), "revenue": revenue, "cost": cost,
                "margin": round(revenue - cost, 2),
                "margin_rate": round((revenue - cost) / revenue * 100, 2) if revenue else 0,
            })
        return Response(data)
