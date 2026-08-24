from django.urls import path

from .views import (
    GlobalDashboardView, MonthlyTrendView, ProfitabilityView, PurchasingDashboardView,
    SalesDashboardView,
)

urlpatterns = [
    path("global/", GlobalDashboardView.as_view(), name="dashboard-global"),
    path("purchasing/", PurchasingDashboardView.as_view(), name="dashboard-purchasing"),
    path("sales/", SalesDashboardView.as_view(), name="dashboard-sales"),
    path("trend/", MonthlyTrendView.as_view(), name="dashboard-trend"),
    path("profitability/", ProfitabilityView.as_view(), name="dashboard-profitability"),
]
