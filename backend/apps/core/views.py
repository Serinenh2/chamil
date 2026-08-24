"""Recherche globale — section 34 du cahier des charges."""
from rest_framework.response import Response
from rest_framework.views import APIView


class GlobalSearchView(APIView):
    """Retrouve clients, fournisseurs, produits, documents et numéros de série."""

    def get(self, request):
        from apps.billing.models import CustomerInvoice
        from apps.catalog.models import Product
        from apps.partners.models import Customer, Supplier
        from apps.sales.models import Quote
        from apps.stock.models import SerialNumber

        term = (request.query_params.get("q") or "").strip()
        if len(term) < 2:
            return Response({"results": [], "detail": "Saisir au moins 2 caractères."})

        def pack(qs, kind, label_field, url):
            return [
                {"type": kind, "id": o.pk, "label": str(getattr(o, label_field)),
                 "url": f"{url}/{o.pk}"}
                for o in qs[:5]
            ]

        results = (
            pack(Supplier.objects.filter(name__icontains=term), "supplier", "name", "/fournisseurs")
            + pack(Customer.objects.filter(name__icontains=term), "customer", "name", "/clients")
            + pack(Product.objects.filter(designation__icontains=term), "product", "designation", "/produits")
            + pack(Quote.objects.filter(number__icontains=term), "quote", "number", "/devis")
            + pack(CustomerInvoice.objects.filter(number__icontains=term), "invoice", "number", "/factures")
            + pack(SerialNumber.objects.filter(serial__icontains=term), "serial", "serial", "/numeros-serie")
        )
        return Response({"query": term, "count": len(results), "results": results})
