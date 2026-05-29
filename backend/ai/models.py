from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

class GameRecommendation(models.Model):
    """Modèle pour les recommandations de jeux"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_recommendations')
    game = models.ForeignKey('games.Game', on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_viewed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'ai_game_recommendations'
        ordering = ['-score']
        unique_together = ('user', 'game')
    
    def __str__(self):
        return f"{self.user.username} - {self.game.title} ({self.score})"

class UserPreference(models.Model):
    """Modèle pour les préférences utilisateur"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    favorite_genres = models.JSONField(default=list, blank=True)
    favorite_tags = models.JSONField(default=list, blank=True)
    price_range_min = models.FloatField(default=0)
    price_range_max = models.FloatField(default=100)
    preferred_platforms = models.JSONField(default=list, blank=True)
    play_style = models.CharField(max_length=50, blank=True)  # casual, hardcore, competitive
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_user_preferences'
    
    def __str__(self):
        return f"{self.user.username} preferences"

class GameSimilarity(models.Model):
    """Modèle pour les similarités entre jeux"""
    game1 = models.ForeignKey('games.Game', on_delete=models.CASCADE, related_name='similar_to')
    game2 = models.ForeignKey('games.Game', on_delete=models.CASCADE, related_name='similar_from')
    similarity_score = models.FloatField(default=0.0)
    
    class Meta:
        db_table = 'ai_game_similarities'
        unique_together = ('game1', 'game2')
    
    def __str__(self):
        return f"{self.game1.title} <-> {self.game2.title} ({self.similarity_score})"