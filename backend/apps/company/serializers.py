from rest_framework import serializers

from .models import CommercialSettings, Company, LoginRecord, OwnerProfile


class CompanySerializer(serializers.ModelSerializer):
    legal_form_label = serializers.CharField(source="get_legal_form_display", read_only=True)
    wilaya_label = serializers.CharField(source="get_wilaya_display", read_only=True)

    class Meta:
        model = Company
        exclude = ("created_by", "updated_by")


class OwnerProfileSerializer(serializers.ModelSerializer):
    """Sérialiseur complet — accessible au dirigeant et à l'administrateur."""

    full_name = serializers.CharField(read_only=True)
    full_name_ar = serializers.CharField(read_only=True)
    position_label = serializers.CharField(source="get_position_display", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = OwnerProfile
        exclude = ("created_by", "updated_by")


class OwnerProfilePublicSerializer(serializers.ModelSerializer):
    """Vue restreinte : aucune donnée d'état civil sensible n'est exposée."""

    full_name = serializers.CharField(read_only=True)
    nin = serializers.SerializerMethodField()

    class Meta:
        model = OwnerProfile
        fields = ("id", "full_name", "position", "company", "nin")

    def get_nin(self, obj):
        return obj.masked_nin()


class CommercialSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommercialSettings
        exclude = ("created_by", "updated_by")


class LoginRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginRecord
        fields = ("id", "ip_address", "device", "successful", "created_at")
