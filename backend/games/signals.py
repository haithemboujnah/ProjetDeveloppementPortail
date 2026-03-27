from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Game, GameVersion
from notifications.models import Notification

@receiver(post_save, sender=GameVersion)
def notify_new_version(sender, instance, created, **kwargs):
    """Notify users when a new game version is released"""
    if created and instance.is_current:
        # Notify all users who own the game
        owners = instance.game.owners.all()
        
        for user_game in owners:
            Notification.objects.create(
                user=user_game.user,
                title=f'Game Update: {instance.game.title}',
                message=f'Version {instance.version_number} is now available!',
                notification_type='info',
                link=f'/games/{instance.game.id}'
            )

@receiver(post_save, sender=Game)
def notify_game_approval(sender, instance, created, **kwargs):
    """Notify developer when game is approved"""
    if not created and instance.status == 'approved':
        Notification.objects.create(
            user=instance.developer,
            title='Game Approved!',
            message=f'Your game "{instance.title}" has been approved and is now live!',
            notification_type='success',
            link=f'/developer/games/{instance.id}'
        )