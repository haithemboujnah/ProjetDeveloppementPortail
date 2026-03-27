from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta

User = get_user_model()

@shared_task
def send_welcome_email(user_id):
    try:
        user = User.objects.get(id=user_id)
        subject = 'Welcome to Steam Clone!'
        message = render_to_string('emails/welcome.html', {
            'user': user,
            'site_name': 'Steam Clone'
        })
        send_mail(
            subject,
            '',
            'noreply@steamclone.com',
            [user.email],
            html_message=message,
            fail_silently=False,
        )
        return f"Welcome email sent to {user.email}"
    except User.DoesNotExist:
        return f"User {user_id} not found"

@shared_task
def send_password_reset_email(user_id, reset_link):
    try:
        user = User.objects.get(id=user_id)
        subject = 'Password Reset Request'
        message = render_to_string('emails/password_reset.html', {
            'user': user,
            'reset_link': reset_link,
            'site_name': 'Steam Clone'
        })
        send_mail(
            subject,
            '',
            'noreply@steamclone.com',
            [user.email],
            html_message=message,
            fail_silently=False,
        )
        return f"Password reset email sent to {user.email}"
    except User.DoesNotExist:
        return f"User {user_id} not found"

@shared_task
def send_daily_digest():
    yesterday = timezone.now() - timedelta(days=1)
    users = User.objects.filter(is_active=True)
    
    for user in users:
        new_games = user.games.filter(release_date__gte=yesterday)
        if new_games.exists():
            subject = 'Your Daily Game Digest'
            message = render_to_string('emails/daily_digest.html', {
                'user': user,
                'games': new_games,
                'site_name': 'Steam Clone'
            })
            send_mail(
                subject,
                '',
                'noreply@steamclone.com',
                [user.email],
                html_message=message,
                fail_silently=True,
            )
    return f"Daily digest sent to {users.count()} users"

@shared_task
def clean_expired_sessions():
    from django.contrib.sessions.models import Session
    expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
    count = expired_sessions.count()
    expired_sessions.delete()
    return f"Deleted {count} expired sessions"