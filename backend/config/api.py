"""Routeur central de l'API v1."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import UserViewSet
from apps.alerts.views import AlertViewSet
from apps.audit.views import AuditLogViewSet
from apps.billing.views import (
    CustomerInvoiceViewSet, PaymentViewSet, SupplierInvoiceViewSet,
)
from apps.catalog.views import (
    BrandViewSet, CategoryViewSet, ProductViewSet, SupplierProductViewSet,
)
from apps.company.views import (
    CommercialSettingsViewSet, CompanyViewSet, OwnerProfileViewSet,
)
from apps.partners.views import (
    CustomerContactViewSet, CustomerViewSet, ProspectViewSet,
    SupplierContactViewSet, SupplierEvaluationViewSet, SupplierViewSet,
)
from apps.purchasing.views import (
    GoodsReceiptViewSet, PurchaseOrderViewSet, PurchaseRequestViewSet,
    SupplierQuoteViewSet,
)
from apps.sales.views import DeliveryViewSet, QuoteViewSet, SalesOrderViewSet
from apps.stock.views import (
    SerialNumberViewSet, StockItemViewSet, StockMovementViewSet, WarehouseViewSet,
)

router = DefaultRouter()

# Utilisateurs & profil
router.register("users", UserViewSet, basename="user")
router.register("profile/owner", OwnerProfileViewSet, basename="owner-profile")
router.register("profile/company", CompanyViewSet, basename="company")
router.register("profile/settings", CommercialSettingsViewSet, basename="settings")

# Partenaires
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("supplier-contacts", SupplierContactViewSet, basename="supplier-contact")
router.register("supplier-evaluations", SupplierEvaluationViewSet, basename="supplier-evaluation")
router.register("customers", CustomerViewSet, basename="customer")
router.register("customer-contacts", CustomerContactViewSet, basename="customer-contact")
router.register("prospects", ProspectViewSet, basename="prospect")

# Catalogue & stock
router.register("categories", CategoryViewSet, basename="category")
router.register("brands", BrandViewSet, basename="brand")
router.register("products", ProductViewSet, basename="product")
router.register("supplier-products", SupplierProductViewSet, basename="supplier-product")
router.register("warehouses", WarehouseViewSet, basename="warehouse")
router.register("stock-items", StockItemViewSet, basename="stock-item")
router.register("stock-movements", StockMovementViewSet, basename="stock-movement")
router.register("serial-numbers", SerialNumberViewSet, basename="serial-number")

# Achats
router.register("purchase-requests", PurchaseRequestViewSet, basename="purchase-request")
router.register("supplier-quotes", SupplierQuoteViewSet, basename="supplier-quote")
router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register("goods-receipts", GoodsReceiptViewSet, basename="goods-receipt")

# Ventes
router.register("quotes", QuoteViewSet, basename="quote")
router.register("sales-orders", SalesOrderViewSet, basename="sales-order")
router.register("deliveries", DeliveryViewSet, basename="delivery")

# Facturation
router.register("customer-invoices", CustomerInvoiceViewSet, basename="customer-invoice")
router.register("supplier-invoices", SupplierInvoiceViewSet, basename="supplier-invoice")
router.register("payments", PaymentViewSet, basename="payment")

# Transverse
router.register("alerts", AlertViewSet, basename="alert")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("dashboard/", include("apps.dashboard.urls")),
    path("documents/", include("apps.documents.urls")),
    path("search/", include("apps.core.urls")),
    path("", include(router.urls)),
]
