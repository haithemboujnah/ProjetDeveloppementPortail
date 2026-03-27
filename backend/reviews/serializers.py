from rest_framework import serializers
from .models import Review, ReviewHelpful, ReviewReply

class ReviewReplySerializer(serializers.ModelSerializer):
    developer_name = serializers.CharField(source='developer.username', read_only=True)
    developer_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = ReviewReply
        fields = [
            'id', 'review', 'developer', 'developer_name', 'developer_avatar',
            'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'developer', 'created_at', 'updated_at']
    
    def get_developer_avatar(self, obj):
        if obj.developer.avatar:
            return obj.developer.avatar
        return None

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    replies = ReviewReplySerializer(many=True, read_only=True)
    can_reply = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'user', 'username', 'user_avatar', 'game', 
            'rating', 'comment', 'helpful_count', 'is_approved', 
            'replies', 'can_reply', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'username', 'user_avatar', 'helpful_count', 'is_approved', 'created_at', 'updated_at']
    
    def get_user_avatar(self, obj):
        if obj.user.avatar:
            return obj.user.avatar
        return None
    
    def get_can_reply(self, obj):
        """Vérifie si l'utilisateur actuel peut répondre à cette review"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Le développeur du jeu peut répondre (et pas l'utilisateur qui a posté la review)
            is_developer = request.user == obj.game.developer
            is_admin = request.user.is_staff
            is_not_self = request.user != obj.user
            return (is_developer or is_admin) and is_not_self
        return False
    
    def validate_rating(self, value):
        """Validation du rating"""
        if value is None:
            raise serializers.ValidationError("Rating is required")
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Rating must be a number")
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate_comment(self, value):
        """Validation du commentaire"""
        if not value:
            raise serializers.ValidationError("Comment is required")
        if not value.strip():
            raise serializers.ValidationError("Comment cannot be empty")
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Comment must be at least 10 characters long")
        return value.strip()