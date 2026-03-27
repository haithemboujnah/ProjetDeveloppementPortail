from rest_framework import serializers
from .models import Game, Category, GameVersion, UserGame, Wishlist

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon']

class GameSerializer(serializers.ModelSerializer):
    developer_name = serializers.CharField(source='developer.username', read_only=True)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Game
        fields = [
            'id', 'developer', 'developer_name', 'title', 'slug', 'description', 
            'short_description', 'price', 'discount_price', 'final_price', 
            'categories', 'cover_image', 'screenshots', 'trailer_url', 
            'file_size', 'game_file', 'executable_name',
            'system_requirements_min', 'system_requirements_rec',
            'release_date', 'last_updated', 'status', 'total_downloads', 
            'total_ratings', 'average_rating'
        ]
        read_only_fields = ['developer', 'total_downloads', 'total_ratings', 'average_rating', 'release_date', 'last_updated']
        extra_kwargs = {
            'slug': {'required': False},
            'cover_image': {'required': False},
            'screenshots': {'required': False},
            'trailer_url': {'required': False},
            'file_size': {'required': False},
            'game_file': {'required': False, 'allow_null': True},
            'executable_name': {'required': False},
            'system_requirements_min': {'required': False},
            'system_requirements_rec': {'required': False},
            'short_description': {'required': False},
            'discount_price': {'required': False, 'allow_null': True},
        }
    
    def create(self, validated_data):
        # Gérer les catégories
        categories_data = validated_data.pop('categories', [])
        
        # Créer le jeu
        game = Game.objects.create(**validated_data)
        
        # Ajouter les catégories
        if categories_data:
            game.categories.set(categories_data)
        
        return game
    
    def update(self, instance, validated_data):
        # Gérer les catégories
        categories_data = validated_data.pop('categories', None)
        
        # Mettre à jour les champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Mettre à jour les catégories
        if categories_data is not None:
            instance.categories.set(categories_data)
        
        return instance

class GameVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameVersion
        fields = ['id', 'game', 'version_number', 'changelog', 'file', 'file_size', 
                  'is_current', 'created_at']

class UserGameSerializer(serializers.ModelSerializer):
    game_title = serializers.CharField(source='game.title', read_only=True)
    game_cover = serializers.SerializerMethodField()
    game_price = serializers.DecimalField(source='game.price', max_digits=10, decimal_places=2, read_only=True)
    game_id = serializers.IntegerField(source='game.id', read_only=True)
    game_file = serializers.CharField(source='game.game_file.url', read_only=True, default=None)
    executable_name = serializers.CharField(source='game.executable_name', read_only=True)
    developer = serializers.CharField(source='game.developer.username', read_only=True)
    
    class Meta:
        model = UserGame
        fields = [
            'id', 'game', 'game_id', 'game_title', 'game_cover', 'game_price',
            'game_file', 'executable_name', 'developer', 'purchased_at', 
            'last_played', 'playtime', 'is_installed', 'install_path'
        ]
    
    def get_game_cover(self, obj):
        if obj.game.cover_image:
            return obj.game.cover_image
        return None

class WishlistSerializer(serializers.ModelSerializer):
    game_title = serializers.CharField(source='game.title', read_only=True)
    game_price = serializers.DecimalField(source='game.price', max_digits=10, decimal_places=2, read_only=True)
    game_cover = serializers.SerializerMethodField()
    game_id = serializers.IntegerField(source='game.id', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'game', 'game_id', 'game_title', 'game_price', 'game_cover', 'added_at']
        read_only_fields = ['added_at']
    
    def get_game_cover(self, obj):
        if obj.game.cover_image:
            return obj.game.cover_image
        return None
    
    def get_game_price(self, obj):
        """Récupère le prix final du jeu"""
        return obj.game.get_final_price()
    
    def get_game_cover(self, obj):
        """Récupère l'URL de l'image du jeu"""
        if obj.game.cover_image:
            if obj.game.cover_image.startswith('http://') or obj.game.cover_image.startswith('https://'):
                return obj.game.cover_image
            return obj.game.cover_image
        return None