from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['website', 'location', 'social_links', 'preferences']
        extra_kwargs = {
            'social_links': {'required': False},
            'preferences': {'required': False}
        }

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    owned_games_count = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    owned_games = serializers.SerializerMethodField()
    wallet_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'avatar', 'bio', 
            'wallet_balance', 'is_verified', 'profile', 'date_joined',
            'first_name', 'last_name', 'owned_games_count', 'reviews_count',
            'owned_games'
        ]
        read_only_fields = ['wallet_balance', 'is_verified', 'date_joined']
    
    def get_owned_games_count(self, obj):
        """Récupère le nombre de jeux possédés"""
        return obj.get_owned_games_count()
    
    def get_reviews_count(self, obj):
        """Récupère le nombre de reviews écrites"""
        return obj.get_reviews_count()
    
    def get_owned_games(self, obj):
        """Récupère la liste des jeux possédés (optionnel)"""
        from games.serializers import UserGameSerializer
        from games.models import UserGame
        owned = UserGame.objects.filter(user=obj)
        return UserGameSerializer(owned, many=True).data
    
    def get_wallet_balance(self, obj):
        """Convertir le wallet_balance en float"""
        return float(obj.wallet_balance) if obj.wallet_balance else 0.0
    
class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour du profil utilisateur"""
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 
            'bio', 'avatar', 'role'
        ]
    
    def validate_username(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value
    
    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'role', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        
        # Create user profile
        UserProfile.objects.create(user=user)
        
        return user