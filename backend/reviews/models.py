from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    game = models.ForeignKey('games.Game', on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    is_approved = models.BooleanField(default=True)
    helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        unique_together = ('user', 'game')
    
    def __str__(self):
        return f"{self.user.username} - {self.game.title} - {self.rating}★"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mettre à jour la note moyenne du jeu
        self.game.update_rating()

class ReviewHelpful(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='helpful_votes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'review_helpful'
        unique_together = ('user', 'review')
    
    def __str__(self):
        return f"{self.user.username} helped on {self.review.id}"

class ReviewReply(models.Model):
    """Réponse à une review (par le développeur du jeu)"""
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='replies')
    developer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_replies')
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'review_replies'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Reply to {self.review.user.username} - {self.review.game.title}"