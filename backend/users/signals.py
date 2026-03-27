from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import UserProfile

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a user profile when a new user is created"""
    if created:
        UserProfile.objects.create(user=instance)
        
        # Send welcome email
        subject = 'Welcome to Steam Clone!'
        message = render_to_string('emails/welcome.html', {
            'user': instance,
            'site_url': 'http://localhost:3000'
        })
        send_mail(
            subject,
            '',
            'noreply@steamclone.com',
            [instance.email],
            html_message=message,
            fail_silently=True,
        )

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save user profile when user is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()