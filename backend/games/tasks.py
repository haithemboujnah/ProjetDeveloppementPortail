from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import Game, GameVersion
from orders.models import OrderItem

@shared_task
def process_game_download(game_id, user_id):
    """Process game download and update stats"""
    from games.models import Game, UserGame
    from django.contrib.auth import get_user_model
    
    try:
        game = Game.objects.get(id=game_id)
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # Update download count
        game.total_downloads += 1
        game.save()
        
        # Update user game record
        user_game, created = UserGame.objects.get_or_create(
            user=user,
            game=game
        )
        
        return f"Download processed for {user.username} - {game.title}"
    except (Game.DoesNotExist, User.DoesNotExist) as e:
        return f"Error: {str(e)}"

@shared_task
def update_featured_status():
    """Update featured games status when expiration passes"""
    expired_games = Game.objects.filter(
        status='featured',
        featured_until__lt=timezone.now()
    )
    
    count = expired_games.count()
    expired_games.update(status='approved')
    
    return f"Updated {count} games from featured to approved"

@shared_task
def send_game_approval_notification(game_id):
    """Send notification when game is approved"""
    try:
        game = Game.objects.get(id=game_id)
        subject = f'Your game "{game.title}" has been approved!'
        message = render_to_string('emails/game_approved.html', {
            'game': game,
            'developer': game.developer,
            'site_name': 'Steam Clone'
        })
        send_mail(
            subject,
            '',
            'noreply@steamclone.com',
            [game.developer.email],
            html_message=message,
            fail_silently=False,
        )
        return f"Approval email sent for {game.title}"
    except Game.DoesNotExist:
        return f"Game {game_id} not found"

@shared_task
def compress_game_files(game_id):
    """Compress game files for optimization (async task)"""
    import zipfile
    import os
    from django.core.files import File
    
    try:
        game = Game.objects.get(id=game_id)
        if game.game_file:
            # This would need actual file compression logic
            # Placeholder for now
            return f"Compressed files for {game.title}"
    except Game.DoesNotExist:
        return f"Game {game_id} not found"