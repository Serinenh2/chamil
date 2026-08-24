from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class ChamilUserAdmin(UserAdmin):
    list_display = ("username", "get_full_name", "role", "is_active", "last_login")
    list_filter = ("role", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        ("CHAMIL", {"fields": ("role", "phone", "avatar", "language", "theme",
                               "two_factor_enabled", "notify_by_email")}),
    )
