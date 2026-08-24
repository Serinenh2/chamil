from rest_framework import serializers

from .models import (
    Customer, CustomerContact, Prospect, Supplier, SupplierContact, SupplierEvaluation,
)


class SupplierContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierContact
        exclude = ("created_by", "updated_by")


class CustomerContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerContact
        exclude = ("created_by", "updated_by")


class SupplierSerializer(serializers.ModelSerializer):
    contacts = SupplierContactSerializer(many=True, read_only=True)
    debt = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    wilaya_label = serializers.CharField(source="get_wilaya_display", read_only=True)

    class Meta:
        model = Supplier
        exclude = ("created_by", "updated_by")
        read_only_fields = ("score",)


class SupplierListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "code", "name", "phone", "email", "wilaya",
                  "payment_term", "lead_time_days", "score", "is_active")


class CustomerSerializer(serializers.ModelSerializer):
    contacts = CustomerContactSerializer(many=True, read_only=True)
    receivable = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    type_label = serializers.CharField(source="get_customer_type_display", read_only=True)

    class Meta:
        model = Customer
        exclude = ("created_by", "updated_by")


class CustomerListSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_customer_type_display", read_only=True)

    class Meta:
        model = Customer
        fields = ("id", "code", "name", "customer_type", "type_label", "phone",
                  "email", "wilaya", "credit_limit", "is_active")


class SupplierEvaluationSerializer(serializers.ModelSerializer):
    global_score = serializers.FloatField(read_only=True)

    class Meta:
        model = SupplierEvaluation
        exclude = ("created_by", "updated_by")


class ProspectSerializer(serializers.ModelSerializer):
    stage_label = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = Prospect
        exclude = ("created_by", "updated_by")
