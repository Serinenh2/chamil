from rest_framework import serializers

from .models import (
    GoodsReceipt, GoodsReceiptLine, PurchaseOrder, PurchaseOrderLine, PurchaseRequest,
    PurchaseRequestLine, SupplierQuote, SupplierQuoteLine,
)


class LineSerializerMixin(serializers.ModelSerializer):
    product_label = serializers.CharField(source="product.designation", read_only=True)
    product_code = serializers.CharField(source="product.code", read_only=True)

    class Meta:
        read_only_fields = ("amount_ht", "amount_vat", "amount_ttc")


class PurchaseRequestLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = PurchaseRequestLine
        fields = "__all__"


class SupplierQuoteLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = SupplierQuoteLine
        fields = "__all__"


class PurchaseOrderLineSerializer(LineSerializerMixin):
    remaining_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta(LineSerializerMixin.Meta):
        model = PurchaseOrderLine
        fields = "__all__"


class GoodsReceiptLineSerializer(LineSerializerMixin):
    missing_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta(LineSerializerMixin.Meta):
        model = GoodsReceiptLine
        fields = "__all__"


class DocumentSerializerMixin(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        read_only_fields = ("number", "amount_ht", "amount_vat", "amount_ttc",
                            "created_by", "updated_by")


class PurchaseRequestSerializer(DocumentSerializerMixin):
    lines = PurchaseRequestLineSerializer(many=True, read_only=True)
    urgency_label = serializers.CharField(source="get_urgency_display", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = PurchaseRequest
        fields = "__all__"


class SupplierQuoteSerializer(DocumentSerializerMixin):
    lines = SupplierQuoteLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = SupplierQuote
        fields = "__all__"


class PurchaseOrderSerializer(DocumentSerializerMixin):
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    is_late = serializers.BooleanField(read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = PurchaseOrder
        fields = "__all__"


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    is_late = serializers.BooleanField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ("id", "number", "date", "supplier", "supplier_name", "amount_ttc",
                  "status", "status_label", "expected_on", "is_late")


class GoodsReceiptSerializer(DocumentSerializerMixin):
    lines = GoodsReceiptLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = GoodsReceipt
        fields = "__all__"
