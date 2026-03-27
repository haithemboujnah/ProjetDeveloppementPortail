from django.db import models
from django.conf import settings
from django.db.models import Avg
from django.core.validators import MinValueValidator, MaxValueValidator
import os

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name

class Game(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('featured', 'Featured'),
    )
    
    developer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='games')
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    categories = models.ManyToManyField(Category, related_name='games')
    
    # Changer ImageField en CharField pour les URLs externes
    cover_image = models.CharField(max_length=500, blank=True)  # URL externe
    screenshots = models.JSONField(default=list, blank=True)  # List of image URLs
    trailer_url = models.URLField(blank=True)
    
    file_size = models.BigIntegerField(default=0)  # in bytes
    game_file = models.FileField(upload_to='games/files/', blank=True, null=True)  # Rendre nullable
    executable_name = models.CharField(max_length=100, blank=True)
    
    system_requirements_min = models.JSONField(default=dict, blank=True)
    system_requirements_rec = models.JSONField(default=dict, blank=True)
    
    release_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_published = models.BooleanField(default=False)
    
    total_downloads = models.PositiveIntegerField(default=0)
    total_ratings = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    
    featured_until = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'games'
        ordering = ['-release_date']
    
    def __str__(self):
        return self.title
    
    def get_final_price(self):
        return self.discount_price if self.discount_price else self.price
    
    def update_rating(self):
        """Met à jour la note moyenne du jeu"""
        from reviews.models import Review
        reviews = Review.objects.filter(game=self, is_approved=True)
        self.total_ratings = reviews.count()
        if self.total_ratings > 0:
            avg_rating = reviews.aggregate(Avg('rating'))['rating__avg']
            self.average_rating = avg_rating if avg_rating else 0
        else:
            self.average_rating = 0
        # Sauvegarder sans déclencher de récursion
        self.save(update_fields=['total_ratings', 'average_rating'])

class GameVersion(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='versions')
    version_number = models.CharField(max_length=20)
    changelog = models.TextField(blank=True)
    file = models.FileField(upload_to='games/versions/')
    file_size = models.BigIntegerField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'game_versions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.game.title} - v{self.version_number}"
    
    def save(self, *args, **kwargs):
        if self.is_current:
            GameVersion.objects.filter(game=self.game, is_current=True).update(is_current=False)
        super().save(*args, **kwargs)

class UserGame(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_games')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='owners')
    purchased_at = models.DateTimeField(auto_now_add=True)
    last_played = models.DateTimeField(null=True, blank=True)
    playtime = models.PositiveIntegerField(default=0)  # in minutes
    is_installed = models.BooleanField(default=False)
    install_path = models.CharField(max_length=500, blank=True)
    
    class Meta:
        db_table = 'user_games'
        unique_together = ('user', 'game')
    
    def __str__(self):
        return f"{self.user.username} - {self.game.title}"

class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist')
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wishlists'
        unique_together = ('user', 'game')
    
    def __str__(self):
        return f"{self.user.username} wants {self.game.title}"