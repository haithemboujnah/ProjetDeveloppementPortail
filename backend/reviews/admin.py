from django.contrib import admin
from .models import Review, ReviewHelpful

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'rating', 'is_approved', 'created_at')
    list_filter = ('rating', 'is_approved')
    search_fields = ('user__username', 'game__title')
    
admin.site.register(ReviewHelpful)