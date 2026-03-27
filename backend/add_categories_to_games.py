from django.core.management.base import BaseCommand
from games.models import Game, Category

class Command(BaseCommand):
    help = 'Add categories to existing games'

    def handle(self, *args, **options):
        # Créer des catégories si elles n'existent pas
        categories_data = [
            {'name': 'Action', 'slug': 'action', 'description': 'Fast-paced action games'},
            {'name': 'RPG', 'slug': 'rpg', 'description': 'Role-playing games'},
            {'name': 'Strategy', 'slug': 'strategy', 'description': 'Strategic thinking games'},
            {'name': 'Adventure', 'slug': 'adventure', 'description': 'Story-driven adventures'},
            {'name': 'Indie', 'slug': 'indie', 'description': 'Independent developer games'},
            {'name': 'Simulation', 'slug': 'simulation', 'description': 'Realistic simulation games'},
            {'name': 'Sports', 'slug': 'sports', 'description': 'Sports and racing games'},
            {'name': 'Puzzle', 'slug': 'puzzle', 'description': 'Brain-teasing puzzle games'},
        ]
        
        created_categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description']
                }
            )
            created_categories.append(category)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
        
        # Ajouter des catégories aux jeux existants
        games = Game.objects.all()
        games_updated = 0
        
        for game in games:
            if not game.categories.exists():
                # Assigner une catégorie basée sur le titre du jeu
                title_lower = game.title.lower()
                if any(word in title_lower for word in ['action', 'shooter', 'fight', 'combat']):
                    game.categories.add(Category.objects.get(slug='action'))
                elif any(word in title_lower for word in ['rpg', 'quest', 'fantasy', 'magic']):
                    game.categories.add(Category.objects.get(slug='rpg'))
                elif any(word in title_lower for word in ['strategy', 'tactics', 'civilization']):
                    game.categories.add(Category.objects.get(slug='strategy'))
                elif any(word in title_lower for word in ['puzzle', 'match', 'brain']):
                    game.categories.add(Category.objects.get(slug='puzzle'))
                elif any(word in title_lower for word in ['sport', 'racing', 'football']):
                    game.categories.add(Category.objects.get(slug='sports'))
                else:
                    # Catégorie par défaut
                    game.categories.add(Category.objects.get(slug='action'))
                
                games_updated += 1
                self.stdout.write(f'Added categories to: {game.title}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {games_updated} games with categories'))
        
        # Afficher les jeux avec leurs catégories
        self.stdout.write('\n📋 Games with categories:')
        for game in Game.objects.all():
            categories = game.categories.all()
            cat_names = [cat.name for cat in categories]
            self.stdout.write(f'  - {game.title}: {", ".join(cat_names) if cat_names else "No categories"}')