from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('developer', 'Developer'),
        ('admin', 'Admin'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    avatar = models.CharField(max_length=500, blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        
    def __str__(self):
        return self.username
    
    def is_developer(self):
        return self.role == 'developer'
    
    def is_admin_user(self):
        return self.role == 'admin' or self.is_superuser
    
    def get_owned_games_count(self):
        """Récupère le nombre de jeux possédés"""
        from games.models import UserGame
        return UserGame.objects.filter(user=self).count()
    
    def get_reviews_count(self):
        """Récupère le nombre de reviews écrites"""
        from reviews.models import Review
        return Review.objects.filter(user=self).count()

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    social_links = models.JSONField(default=dict, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Profile of {self.user.username}"