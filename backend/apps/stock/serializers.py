from rest_framework import serializers

from .models import SerialNumber, StockItem, StockMovement, Warehouse


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        exclude = ("created_by", "updated_by")


class StockItemSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="product.code", read_only=True)
    product_label = serializers.CharField(source="product.designation", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    status = serializers.CharField(source="product.stock_status", read_only=True)
    value = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = StockItem
        exclude = ("created_by", "updated_by")


class StockMovementSerializer(serializers.ModelSerializer):
    product_label = serializers.CharField(source="product.designation", read_only=True)
    type_label = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        exclude = ("created_by", "updated_by")


class SerialNumberSerializer(serializers.ModelSerializer):
    product_label = serializers.CharField(source="product.designation", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SerialNumber
        exclude = ("created_by", "updated_by")
