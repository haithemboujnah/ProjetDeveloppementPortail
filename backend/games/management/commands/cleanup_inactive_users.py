from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Clean up inactive users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Number of days of inactivity to consider a user inactive'
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff_date = timezone.now() - timedelta(days=days)
        
        inactive_users = User.objects.filter(
            last_login__lt=cutoff_date,
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        
        count = inactive_users.count()
        
        if count > 0:
            self.stdout.write(f'Found {count} inactive users')
            
            # Optionally deactivate them instead of deleting
            inactive_users.update(is_active=False)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully deactivated {count} users'))
        else:
            self.stdout.write('No inactive users found')