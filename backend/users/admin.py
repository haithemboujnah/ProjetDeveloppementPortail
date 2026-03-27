from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'wallet_balance', 'is_verified', 'avatar_preview', 'date_joined')
    list_filter = ('role', 'is_verified', 'is_active', 'is_staff')
    search_fields = ('username', 'email')
    list_editable = ('role', 'is_verified')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Information', {
            'fields': ('role', 'avatar', 'bio', 'wallet_balance', 'is_verified'),
            'classes': ('wide',)
        }),
    )
    
    inlines = [UserProfileInline]
    
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" width="50" height="50" style="border-radius: 50%;" />', obj.avatar.url)
        return "No avatar"
    avatar_preview.short_description = 'Avatar'

admin.site.register(User, CustomUserAdmin)
admin.site.register(UserProfile)