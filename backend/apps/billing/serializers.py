from rest_framework import serializers

from apps.purchasing.serializers import DocumentSerializerMixin, LineSerializerMixin

from .models import (
    CreditNote, CustomerInvoice, CustomerInvoiceLine, Payment, SupplierInvoice,
    SupplierInvoiceLine,
)


class CustomerInvoiceLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = CustomerInvoiceLine
        fields = "__all__"


class SupplierInvoiceLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = SupplierInvoiceLine
        fields = "__all__"


class InvoiceMixin(DocumentSerializerMixin):
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    ageing_bucket = serializers.CharField(read_only=True)


class CustomerInvoiceLineWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CustomerInvoiceLine
        fields = ("id", "product", "description", "quantity", "unit_price", "discount", "vat_rate")


class CustomerInvoiceSerializer(InvoiceMixin):
    lines = CustomerInvoiceLineSerializer(many=True, read_only=True)
    line_items = CustomerInvoiceLineWriteSerializer(many=True, write_only=True, required=False)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = CustomerInvoice
        fields = "__all__"
        read_only_fields = ("number", "amount_ht", "amount_vat", "amount_ttc",
                            "paid_amount", "created_by", "updated_by")

    def create(self, validated_data):
        lines_data = validated_data.pop("line_items", None)
        invoice = super().create(validated_data)
        if lines_data is not None:
            self._sync_lines(invoice, lines_data)
        invoice = invoice.recompute()
        invoice.refresh_status()
        return invoice

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("line_items", None)
        invoice = super().update(instance, validated_data)
        if lines_data is not None:
            self._sync_lines(invoice, lines_data)
        invoice = invoice.recompute()
        invoice.refresh_status()
        return invoice

    def _sync_lines(self, invoice, lines_data):
        existing = {line.id: line for line in invoice.lines.all()}
        keep_ids = set()
        for line_data in lines_data:
            line_id = line_data.pop("id", None)
            if line_id and line_id in existing:
                line = existing[line_id]
                for attr, value in line_data.items():
                    setattr(line, attr, value)
                line.save()
                keep_ids.add(line_id)
            else:
                new_line = CustomerInvoiceLine.objects.create(invoice=invoice, **line_data)
                keep_ids.add(new_line.id)
        for line_id, line in existing.items():
            if line_id not in keep_ids:
                line.delete()


class CustomerInvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomerInvoice
        fields = ("id", "number", "date", "due_date", "customer", "customer_name",
                  "amount_ttc", "paid_amount", "balance", "status", "status_label",
                  "days_overdue")


class SupplierInvoiceSerializer(InvoiceMixin):
    lines = SupplierInvoiceLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = SupplierInvoice
        fields = "__all__"
        read_only_fields = ("number", "amount_ht", "amount_vat", "amount_ttc",
                            "paid_amount", "created_by", "updated_by")


class PaymentSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    direction_label = serializers.CharField(source="get_direction_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = Payment
        exclude = ("created_by", "updated_by")
        read_only_fields = ("number",)

    def validate(self, attrs):
        if not attrs.get("customer") and not attrs.get("supplier"):
            raise serializers.ValidationError(
                "Indiquer soit un client, soit un fournisseur.")
        if attrs.get("amount", 0) <= 0:
            raise serializers.ValidationError({"amount": "Le montant doit être positif."})
        return attrs


class CreditNoteSerializer(DocumentSerializerMixin):
    class Meta(DocumentSerializerMixin.Meta):
        model = CreditNote
        fields = "__all__"
