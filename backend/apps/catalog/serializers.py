from rest_framework import serializers

from .models import Brand, Category, Product, SupplierProduct


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        exclude = ("created_by", "updated_by")


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        exclude = ("created_by", "updated_by")


class SupplierProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    product_label = serializers.CharField(source="product.designation", read_only=True)

    class Meta:
        model = SupplierProduct
        exclude = ("created_by", "updated_by")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    margin = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    margin_rate = serializers.FloatField(read_only=True)
    stock_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    suppliers = SupplierProductSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        exclude = ("created_by", "updated_by")


class ProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    stock_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = ("id", "code", "designation", "brand_name", "unit", "purchase_price",
                  "sale_price", "vat_rate", "stock_quantity", "stock_status", "is_active")
