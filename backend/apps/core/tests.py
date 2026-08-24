"""Tests de bout en bout du parcours commercial CHAMIL."""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User


class ApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner", password="Chamil2026!", role=Role.OWNER)
        cls.viewer = User.objects.create_user(
            username="viewer", password="Chamil2026!", role=Role.VIEWER)

    def setUp(self):
        self.client = APIClient()

    def login(self, username="owner"):
        response = self.client.post("/api/v1/auth/login/",
                                    {"username": username, "password": "Chamil2026!"},
                                    format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data

    def test_login_returns_role_and_user(self):
        data = self.login()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["user"]["role"], "owner")

    def test_anonymous_is_rejected(self):
        self.assertEqual(self.client.get("/api/v1/suppliers/").status_code, 401)

    def test_viewer_cannot_write(self):
        self.login("viewer")
        response = self.client.post("/api/v1/suppliers/",
                                    {"code": "F1", "name": "Test"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_owner_can_create_supplier(self):
        self.login()
        response = self.client.post("/api/v1/suppliers/",
                                    {"code": "FRN100", "name": "SARL Test"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["code"], "FRN100")

    def test_dashboards_respond(self):
        self.login()
        for path in ("global", "purchasing", "sales", "trend", "profitability"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/api/v1/dashboard/{path}/").status_code, 200)

    def test_owner_profile_is_private(self):
        """Un utilisateur non dirigeant ne doit pas lire les données personnelles."""
        self.login("viewer")
        self.assertEqual(self.client.get("/api/v1/profile/owner/").status_code, 403)


class CommercialChainTests(TestCase):
    """Vérifie la chaîne FOURNISSEUR → ACHAT → STOCK → VENTE → FACTURE → PAIEMENT."""

    def test_full_chain_updates_stock_and_balance(self):
        from apps.billing.models import CustomerInvoice, CustomerInvoiceLine, Payment
        from apps.catalog.models import Product
        from apps.partners.models import Customer, Supplier
        from apps.purchasing.models import (
            GoodsReceipt, GoodsReceiptLine, PurchaseOrder, PurchaseOrderLine,
        )
        from apps.sales.models import Delivery, DeliveryLine
        from apps.stock.models import Warehouse

        supplier = Supplier.objects.create(code="F1", name="Fournisseur")
        customer = Customer.objects.create(code="C1", name="Client")
        warehouse = Warehouse.objects.create(code="D1", name="Dépôt")
        product = Product.objects.create(code="P1", designation="Produit",
                                         purchase_price=Decimal("100"),
                                         sale_price=Decimal("150"))

        order = PurchaseOrder.objects.create(supplier=supplier)
        PurchaseOrderLine.objects.create(order=order, product=product,
                                         quantity=Decimal("10"), unit_price=Decimal("100"),
                                         vat_rate=Decimal("19"))
        order.recompute()
        self.assertEqual(order.amount_ht, Decimal("1000.00"))
        self.assertEqual(order.amount_ttc, Decimal("1190.00"))

        receipt = GoodsReceipt.objects.create(supplier=supplier, order=order,
                                              warehouse=warehouse)
        GoodsReceiptLine.objects.create(receipt=receipt, product=product,
                                        quantity=Decimal("10"),
                                        ordered_quantity=Decimal("10"),
                                        received_quantity=Decimal("10"),
                                        unit_price=Decimal("100"))
        receipt.apply_to_stock()
        self.assertEqual(product.stock_quantity, Decimal("10.00"))

        delivery = Delivery.objects.create(customer=customer, warehouse=warehouse)
        DeliveryLine.objects.create(delivery=delivery, product=product,
                                    quantity=Decimal("4"), unit_price=Decimal("150"))
        delivery.apply_to_stock()
        self.assertEqual(product.stock_quantity, Decimal("6.00"))

        invoice = CustomerInvoice.objects.create(customer=customer)
        CustomerInvoiceLine.objects.create(invoice=invoice, product=product,
                                           quantity=Decimal("4"), unit_price=Decimal("150"),
                                           vat_rate=Decimal("19"))
        invoice.recompute()
        self.assertEqual(invoice.amount_ttc, Decimal("714.00"))

        Payment.objects.create(direction=Payment.Direction.IN, customer=customer,
                               customer_invoice=invoice, amount=Decimal("300"))
        invoice.refresh_from_db()
        self.assertEqual(invoice.balance, Decimal("414.00"))
        self.assertEqual(invoice.status, "partial")

        Payment.objects.create(direction=Payment.Direction.IN, customer=customer,
                               customer_invoice=invoice, amount=Decimal("414"))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "paid")
        self.assertEqual(customer.receivable, Decimal("0.00"))

    def test_document_numbering_is_sequential(self):
        from apps.partners.models import Supplier
        from apps.purchasing.models import PurchaseOrder

        supplier = Supplier.objects.create(code="F2", name="F2")
        numbers = [PurchaseOrder.objects.create(supplier=supplier).number for _ in range(3)]
        self.assertTrue(numbers[0].startswith("BC-"))
        self.assertEqual([n.rsplit("-", 1)[1] for n in numbers], ["0001", "0002", "0003"])
