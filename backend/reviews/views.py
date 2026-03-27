from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Review, ReviewHelpful, ReviewReply
from .serializers import ReviewSerializer, ReviewReplySerializer
import logging

logger = logging.getLogger(__name__)

class ReviewListView(generics.ListCreateAPIView):
    """Liste toutes les reviews ou crée une nouvelle review"""
    serializer_class = ReviewSerializer
    
    def get_queryset(self):
        game_id = self.request.query_params.get('game_id')
        if game_id:
            try:
                game_id = int(game_id)
                return Review.objects.filter(game_id=game_id, is_approved=True)
            except ValueError:
                return Review.objects.none()
        return Review.objects.filter(is_approved=True)
    
    def get_serializer_context(self):
        """Ajouter la requête au contexte du serializer"""
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Review create request data: {request.data}")
        logger.info(f"User: {request.user}")
        
        # Vérifier si l'utilisateur est authentifié
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Vérifier si game est présent
        game_id = request.data.get('game')
        if not game_id:
            return Response(
                {'error': 'Game ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier si l'utilisateur a déjà review ce jeu
        if Review.objects.filter(user=request.user, game_id=game_id).exists():
            return Response(
                {'error': 'You have already reviewed this game'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier le rating
        rating = request.data.get('rating')
        if not rating:
            return Response(
                {'error': 'Rating is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return Response(
                    {'error': 'Rating must be between 1 and 5'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Rating must be a number'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier le commentaire
        comment = request.data.get('comment')
        if not comment or comment.strip() == '':
            return Response(
                {'error': 'Comment is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(comment.strip()) < 10:
            return Response(
                {'error': 'Comment must be at least 10 characters long'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer la review sans inclure le user dans les données
        review = Review.objects.create(
            user=request.user,
            game_id=game_id,
            rating=rating,
            comment=comment.strip()
        )
        
        # Sérialiser la réponse
        serializer = self.get_serializer(review)
        logger.info(f"Review created successfully: {serializer.data}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Récupère, modifie ou supprime une review spécifique"""
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
    
    def check_object_permissions(self, request, obj):
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if not (request.user == obj.user or request.user.is_staff):
                self.permission_denied(request)
        return super().check_object_permissions(request, obj)
    
    def perform_update(self, serializer):
        """Met à jour la review"""
        serializer.save()
        # Mettre à jour la note du jeu
        serializer.instance.game.update_rating()
    
    def perform_destroy(self, instance):
        """Supprime la review"""
        game = instance.game
        instance.delete()
        game.update_rating()


class ReviewHelpfulView(APIView):
    """Marque une review comme utile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, review_id):
        try:
            review = Review.objects.get(id=review_id)
            helpful, created = ReviewHelpful.objects.get_or_create(
                user=request.user, 
                review=review
            )
            if created:
                review.helpful_count += 1
                review.save()
                return Response({
                    'message': 'Marked as helpful', 
                    'helpful_count': review.helpful_count
                })
            return Response(
                {'message': 'Already marked as helpful'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Review.DoesNotExist:
            return Response(
                {'error': 'Review not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ReviewReplyView(APIView):
    """Ajoute une réponse à une review (développeur seulement)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, review_id):
        try:
            review = Review.objects.get(id=review_id)
            
            # Vérifier que l'utilisateur est le développeur du jeu
            if request.user != review.game.developer and not request.user.is_staff:
                return Response(
                    {'error': 'Only the game developer can reply to reviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comment = request.data.get('comment')
            if not comment or not comment.strip():
                return Response(
                    {'error': 'Comment is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if len(comment.strip()) < 5:
                return Response(
                    {'error': 'Reply must be at least 5 characters long'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Créer la réponse
            reply = ReviewReply.objects.create(
                review=review,
                developer=request.user,
                comment=comment.strip()
            )
            
            # Sérialiser la réponse
            serializer = ReviewReplySerializer(reply)
            
            # Notifier l'utilisateur (optionnel)
            # Notification.objects.create(
            #     user=review.user,
            #     title='Developer replied to your review',
            #     message=f'The developer replied to your review on {review.game.title}',
            #     notification_type='info',
            #     link=f'/game/{review.game.id}'
            # )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Review.DoesNotExist:
            return Response(
                {'error': 'Review not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, review_id, reply_id=None):
        """Supprime une réponse (développeur seulement)"""
        try:
            if reply_id:
                reply = ReviewReply.objects.get(id=reply_id, review_id=review_id)
            else:
                return Response(
                    {'error': 'Reply ID required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Vérifier que l'utilisateur est le développeur ou admin
            if request.user != reply.developer and not request.user.is_staff:
                return Response(
                    {'error': 'Only the developer can delete this reply'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            reply.delete()
            return Response(
                {'message': 'Reply deleted successfully'}, 
                status=status.HTTP_200_OK
            )
            
        except ReviewReply.DoesNotExist:
            return Response(
                {'error': 'Reply not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )