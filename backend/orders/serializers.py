from rest_framework import serializers
from .models import Order, OrderItem
from games.models import Game
from games.serializers import GameSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    game_details = GameSerializer(source='game', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'game', 'game_details', 'price_paid']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'order_number', 'user', 'username', 'total_amount', 
                  'status', 'items', 'stripe_payment_intent', 'created_at', 'completed_at']
        read_only_fields = ['order_number', 'created_at', 'completed_at']

class OrderCreateSerializer(serializers.Serializer):
    games = serializers.PrimaryKeyRelatedField(
        queryset=Game.objects.filter(is_published=True, status__in=['approved', 'featured']),
        many=True
    )
    stripe_payment_intent = serializers.CharField(required=False, allow_blank=True)