from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Game, GameVersion, UserGame, Wishlist

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('title', 'developer', 'price', 'discount_price', 'status', 'is_published', 'cover_preview')
    list_filter = ('status', 'is_published', 'categories', 'developer')
    search_fields = ('title', 'developer__username')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('total_downloads', 'total_ratings', 'average_rating', 'release_date', 'last_updated')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('developer', 'title', 'slug', 'description', 'short_description', 'categories')
        }),
        ('Pricing', {
            'fields': ('price', 'discount_price'),
            'classes': ('wide',)
        }),
        ('Media', {
            'fields': ('cover_image', 'screenshots', 'trailer_url'),
            'classes': ('wide',)
        }),
        ('Game Files', {
            'fields': ('game_file', 'executable_name', 'file_size'),
            'classes': ('wide',)
        }),
        ('System Requirements', {
            'fields': ('system_requirements_min', 'system_requirements_rec'),
            'classes': ('wide',)
        }),
        ('Status & Metrics', {
            'fields': ('status', 'is_published', 'featured_until', 'total_downloads', 
                      'total_ratings', 'average_rating'),
            'classes': ('wide',)
        }),
    )
    
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html('<img src="{}" width="100" height="100" />', obj.cover_image.url)
        return "No cover"
    cover_preview.short_description = 'Cover Image'
    
    actions = ['approve_games', 'reject_games', 'feature_games']
    
    def approve_games(self, request, queryset):
        updated = queryset.update(status='approved', is_published=True)
        self.message_user(request, f'{updated} games approved.')
    approve_games.short_description = 'Approve selected games'
    
    def reject_games(self, request, queryset):
        updated = queryset.update(status='rejected', is_published=False)
        self.message_user(request, f'{updated} games rejected.')
    reject_games.short_description = 'Reject selected games'
    
    def feature_games(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        updated = queryset.update(status='featured', featured_until=timezone.now() + timedelta(days=7))
        self.message_user(request, f'{updated} games featured for 7 days.')
    feature_games.short_description = 'Feature selected games'

@admin.register(GameVersion)
class GameVersionAdmin(admin.ModelAdmin):
    list_display = ('game', 'version_number', 'file_size', 'is_current', 'created_at')
    list_filter = ('is_current', 'created_at')
    search_fields = ('game__title', 'version_number')
    readonly_fields = ('created_at',)

@admin.register(UserGame)
class UserGameAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'playtime', 'is_installed', 'purchased_at', 'last_played')
    list_filter = ('is_installed', 'purchased_at')
    search_fields = ('user__username', 'game__title')
    readonly_fields = ('purchased_at',)

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'game', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('user__username', 'game__title')
    readonly_fields = ('added_at',)