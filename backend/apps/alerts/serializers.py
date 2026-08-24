from rest_framework import serializers

from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    severity_label = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = Alert
        exclude = ("created_by", "updated_by")
