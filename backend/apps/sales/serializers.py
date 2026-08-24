from rest_framework import serializers

from apps.purchasing.serializers import DocumentSerializerMixin, LineSerializerMixin

from .models import Delivery, DeliveryLine, Quote, QuoteLine, SalesOrder, SalesOrderLine


class QuoteLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = QuoteLine
        fields = "__all__"


class SalesOrderLineSerializer(LineSerializerMixin):
    remaining_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta(LineSerializerMixin.Meta):
        model = SalesOrderLine
        fields = "__all__"


class DeliveryLineSerializer(LineSerializerMixin):
    class Meta(LineSerializerMixin.Meta):
        model = DeliveryLine
        fields = "__all__"


class QuoteSerializer(DocumentSerializerMixin):
    lines = QuoteLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = Quote
        fields = "__all__"


class QuoteListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Quote
        fields = ("id", "number", "date", "customer", "customer_name", "amount_ttc",
                  "status", "status_label", "valid_until")


class SalesOrderSerializer(DocumentSerializerMixin):
    lines = SalesOrderLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = SalesOrder
        fields = "__all__"


class DeliverySerializer(DocumentSerializerMixin):
    lines = DeliveryLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = Delivery
        fields = "__all__"
