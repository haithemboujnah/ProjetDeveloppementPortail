import os
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum, Avg
from games.models import Game, UserGame
from orders.models import OrderItem

class Command(BaseCommand):
    help = 'Update game statistics'

    def handle(self, *args, **options):
        self.stdout.write('Updating game statistics...')
        
        games = Game.objects.all()
        updated_count = 0
        
        for game in games:
            # Update download count
            game.total_downloads = UserGame.objects.filter(game=game).count()
            
            # Update revenue
            revenue = OrderItem.objects.filter(
                game=game,
                order__status='completed'
            ).aggregate(total=Sum('price_paid'))['total'] or 0
            
            # Update playtime stats
            playtime_stats = UserGame.objects.filter(game=game).aggregate(
                total_playtime=Sum('playtime'),
                avg_playtime=Avg('playtime')
            )
            
            game.save()
            updated_count += 1
            
            self.stdout.write(f'Updated {game.title}: {game.total_downloads} downloads, ${revenue} revenue')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} games'))