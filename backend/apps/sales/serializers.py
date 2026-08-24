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


class QuoteLineWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = QuoteLine
        fields = ("id", "product", "description", "quantity", "unit_price", "discount", "vat_rate")


class QuoteSerializer(DocumentSerializerMixin):
    lines = QuoteLineSerializer(many=True, read_only=True)
    line_items = QuoteLineWriteSerializer(many=True, write_only=True, required=False)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta(DocumentSerializerMixin.Meta):
        model = Quote
        fields = "__all__"

    def create(self, validated_data):
        lines_data = validated_data.pop("line_items", None)
        quote = super().create(validated_data)
        if lines_data is not None:
            self._sync_lines(quote, lines_data)
        return quote.recompute()

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("line_items", None)
        quote = super().update(instance, validated_data)
        if lines_data is not None:
            self._sync_lines(quote, lines_data)
        return quote.recompute()

    def _sync_lines(self, quote, lines_data):
        existing = {line.id: line for line in quote.lines.all()}
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
                new_line = QuoteLine.objects.create(quote=quote, **line_data)
                keep_ids.add(new_line.id)
        for line_id, line in existing.items():
            if line_id not in keep_ids:
                line.delete()


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
