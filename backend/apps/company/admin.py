from django.contrib import admin

from .models import CommercialSettings, Company, LoginRecord, OwnerProfile

admin.site.register([Company, OwnerProfile, CommercialSettings, LoginRecord])
admin.site.site_header = "CHAMIL — شـامل"
admin.site.site_title = "CHAMIL"
