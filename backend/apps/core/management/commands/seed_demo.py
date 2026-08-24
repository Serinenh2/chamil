"""Jeu de données de démonstration : parcours complet achats → stock → ventes → paiement.

    python manage.py seed_demo
"""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Crée une entreprise, un dirigeant, des partenaires et un cycle commercial complet."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Vide les données de démonstration avant de recréer.")

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.accounts.models import Role, User
        from apps.billing.models import CustomerInvoice, Payment
        from apps.catalog.models import Brand, Category, Product, SupplierProduct
        from apps.company.models import CommercialSettings, Company, OwnerProfile
        from apps.core.models import DocumentStatus
        from apps.partners.models import Customer, CustomerType, Supplier, SupplierContact
        from apps.purchasing.models import (
            GoodsReceipt, GoodsReceiptLine, PurchaseOrder, PurchaseOrderLine,
        )
        from apps.sales.models import Delivery, DeliveryLine, Quote, QuoteLine, SalesOrderLine
        from apps.stock.models import Warehouse

        today = timezone.now().date()

        # --- Entreprise & dirigeant (section 39) ---------------------------------
        company, _ = Company.objects.get_or_create(
            name="SARL Bureautique Alger",
            defaults=dict(
                name_ar="ش.ذ.م.م للتجهيزات المكتبية", legal_form="SARL",
                main_activity="Bureautique, informatique et réseaux",
                rc="16/00-1234567B26", nif="000916123456789", nis="099816000123456",
                capital=Decimal("5000000"), wilaya="16", commune="Alger-Centre",
                phone="+213 21 00 00 00", email="contact@bureautique-alger.dz",
                bank="BNA", rib="001 00123 4567890123 45", headcount=18,
            ),
        )
        settings_obj, _ = CommercialSettings.objects.get_or_create(company=company)

        owner_user, created = User.objects.get_or_create(
            username="karim", defaults=dict(
                first_name="Karim", last_name="Benali", email="k.benali@bureautique-alger.dz",
                role=Role.OWNER, is_staff=True, is_superuser=True, language="fr"),
        )
        if created:
            owner_user.set_password("Chamil2026!")
            owner_user.save()

        OwnerProfile.objects.get_or_create(
            user=owner_user, defaults=dict(
                company=company, last_name="Benali", first_name="Karim",
                last_name_ar="بن علي", first_name_ar="كريم",
                birth_date="1978-04-19", birth_place="Alger", nin="109816000004821",
                position=OwnerProfile.Position.OWNER, appointed_on="2012-03-01",
                capital_share=Decimal("100"), mobile="+213 55 00 00 12",
                personal_email="k.benali@exemple.dz", wilaya="16",
            ),
        )

        for username, role in [("commercial01", Role.SALES), ("acheteur01", Role.BUYER),
                               ("magasin01", Role.STOCK), ("compta01", Role.ACCOUNTANT)]:
            user, made = User.objects.get_or_create(
                username=username, defaults={"role": role, "first_name": username})
            if made:
                user.set_password("Chamil2026!")
                user.save()

        # --- Référentiels --------------------------------------------------------
        warehouse, _ = Warehouse.objects.get_or_create(
            code="DEP01", defaults={"name": "Dépôt principal", "is_default": True})
        category, _ = Category.objects.get_or_create(name="Impression")
        brand, _ = Brand.objects.get_or_create(name="HP")

        product, _ = Product.objects.get_or_create(
            code="IMP-M404", defaults=dict(
                designation="Imprimante HP LaserJet M404", designation_ar="طابعة HP ليزر M404",
                category=category, brand=brand, model="M404dn", reference="W1A53A",
                purchase_price=Decimal("82500"), sale_price=Decimal("104000"),
                vat_rate=Decimal("19"), min_stock=Decimal("5"), max_stock=Decimal("40"),
                warranty_months=24, has_serial=True),
        )

        suppliers = []
        for code, name, price, lead in [
            ("FRN001", "SARL Informatique Nord", Decimal("85000"), 7),
            ("FRN002", "EURL TechnoBureau", Decimal("82500"), 5),
            ("FRN003", "SARL Medina Distribution", Decimal("87000"), 3),
        ]:
            supplier, _ = Supplier.objects.get_or_create(
                code=code, defaults=dict(name=name, wilaya="16", phone="+213 21 11 22 33",
                                         email=f"{code.lower()}@exemple.dz",
                                         lead_time_days=lead, warranty_months=24))
            SupplierProduct.objects.get_or_create(
                supplier=supplier, product=product,
                defaults=dict(price=price, lead_time_days=lead, warranty_months=24))
            SupplierContact.objects.get_or_create(
                supplier=supplier, last_name="Amrani", defaults=dict(
                    first_name="Sofiane", job_title="Responsable commercial",
                    is_commercial=True, email=f"contact@{code.lower()}.dz"))
            suppliers.append(supplier)

        customer, _ = Customer.objects.get_or_create(
            code="CLI001", defaults=dict(
                name="Direction des Impôts — Alger", customer_type=CustomerType.PUBLIC_ADMIN,
                wilaya="16", phone="+213 21 44 55 66", email="dgi.alger@exemple.dz",
                credit_limit=Decimal("2000000")),
        )

        # --- Cycle ACHAT : commande → réception → stock --------------------------
        order = PurchaseOrder.objects.create(
            supplier=suppliers[1], status=DocumentStatus.VALIDATED,
            expected_on=today + timedelta(days=5), created_by=owner_user)
        PurchaseOrderLine.objects.create(
            order=order, product=product, quantity=Decimal("12"),
            unit_price=Decimal("82500"), vat_rate=Decimal("19"))
        order.recompute()

        receipt = GoodsReceipt.objects.create(
            supplier=suppliers[1], order=order, warehouse=warehouse,
            received_on=today, created_by=owner_user)
        GoodsReceiptLine.objects.create(
            receipt=receipt, product=product, quantity=Decimal("12"),
            ordered_quantity=Decimal("12"), received_quantity=Decimal("12"),
            unit_price=Decimal("82500"), vat_rate=Decimal("19"))
        receipt.recompute()
        receipt.apply_to_stock(user=owner_user)

        # --- Cycle VENTE : devis → commande → livraison → facture → paiement -----
        quote = Quote.objects.create(
            customer=customer, valid_until=today + timedelta(days=30),
            status=DocumentStatus.PENDING, created_by=owner_user)
        QuoteLine.objects.create(
            quote=quote, product=product, quantity=Decimal("8"),
            unit_price=Decimal("104000"), vat_rate=Decimal("19"))
        quote.recompute()

        sales_order = quote.orders.first()
        if not sales_order:
            from apps.sales.models import SalesOrder

            sales_order = SalesOrder.objects.create(
                customer=customer, quote=quote, status=DocumentStatus.VALIDATED,
                created_by=owner_user)
            for line in quote.lines.all():
                SalesOrderLine.objects.create(
                    order=sales_order, product=line.product, quantity=line.quantity,
                    unit_price=line.unit_price, vat_rate=line.vat_rate)
            sales_order.recompute()

        delivery = Delivery.objects.create(
            customer=customer, order=sales_order, warehouse=warehouse,
            delivered_on=today, created_by=owner_user)
        DeliveryLine.objects.create(
            delivery=delivery, product=product, quantity=Decimal("8"),
            unit_price=Decimal("104000"), vat_rate=Decimal("19"))
        delivery.recompute()
        delivery.apply_to_stock(user=owner_user)

        invoice = CustomerInvoice.objects.create(
            customer=customer, order=sales_order, delivery=delivery,
            due_date=today - timedelta(days=12), created_by=owner_user)
        from apps.billing.models import CustomerInvoiceLine

        CustomerInvoiceLine.objects.create(
            invoice=invoice, product=product, quantity=Decimal("8"),
            unit_price=Decimal("104000"), vat_rate=Decimal("19"))
        invoice.recompute()
        invoice.refresh_status()

        Payment.objects.create(
            direction=Payment.Direction.IN, customer=customer, customer_invoice=invoice,
            amount=Decimal("400000"), method="transfer", bank="BNA",
            reference="VIR-2026-0091", created_by=owner_user)
        invoice.refresh_from_db()

        # --- Alertes -------------------------------------------------------------
        from apps.alerts.tasks import generate_all_alerts

        alert_summary = generate_all_alerts()

        self.stdout.write(self.style.SUCCESS("Jeu de démonstration créé."))
        self.stdout.write(f"  Entreprise      : {company.name}")
        self.stdout.write(f"  Dirigeant       : karim / Chamil2026!")
        self.stdout.write(f"  Commande achat  : {order.number} — {order.amount_ttc}")
        self.stdout.write(f"  Réception       : {receipt.number} (stock appliqué)")
        self.stdout.write(f"  Stock restant   : {product.stock_quantity}")
        self.stdout.write(f"  Devis           : {quote.number} — {quote.amount_ttc}")
        self.stdout.write(f"  Livraison       : {delivery.number}")
        self.stdout.write(f"  Facture         : {invoice.number} — solde {invoice.balance} "
                          f"({invoice.get_status_display()})")
        self.stdout.write(f"  Alertes         : {alert_summary}")
