from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Avg
from django.utils import timezone
from .models import Game, Category, GameVersion, UserGame, Wishlist
from .serializers import GameSerializer, CategorySerializer, GameVersionSerializer, UserGameSerializer, WishlistSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.permissions import IsDeveloper


class GameListView(generics.ListCreateAPIView):
    serializer_class = GameSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    filterset_fields = ['categories', 'developer']
    ordering_fields = ['price', 'average_rating', 'release_date']
    
    def get_queryset(self):
        user = self.request.user
        
        is_admin_panel = self.request.GET.get('admin') == 'true'
        
        if is_admin_panel and user.is_authenticated and (user.is_staff or user.role == 'admin'):
            return Game.objects.all().order_by('-release_date')
        
        return Game.objects.filter(is_published=True, status='approved').order_by('-release_date')
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsDeveloper()]
        return [permissions.AllowAny()]
    
    def perform_create(self, serializer):
        serializer.save(developer=self.request.user)
    
    def create(self, request, *args, **kwargs):
        print("=== Creating game ===")
        print("User:", request.user)
        print("User role:", request.user.role)
        print("Request data:", request.data)
        
        if request.user.role != 'developer' and not request.user.is_staff:
            return Response(
                {'error': 'Only developers can create games'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class GameDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
    
    def check_object_permissions(self, request, obj):
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if not (request.user == obj.developer or request.user.is_staff):
                self.permission_denied(request)
        return super().check_object_permissions(request, obj)

@api_view(['GET'])
def test_categories(request):
    """Endpoint de test pour vérifier les catégories des jeux"""
    games = Game.objects.filter(is_published=True, status='approved')
    data = []
    for game in games:
        data.append({
            'id': game.id,
            'title': game.title,
            'categories': [{'id': cat.id, 'name': cat.name} for cat in game.categories.all()]
        })
    return Response(data)

# Category Views
class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

# Wishlist Views
class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Récupérer l'ID du jeu depuis les données
        game_id = request.data.get('game')
        
        if not game_id:
            return Response(
                {'error': 'Game ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier si le jeu existe
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response(
                {'error': 'Game not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier si déjà dans la wishlist
        if Wishlist.objects.filter(user=request.user, game=game).exists():
            return Response(
                {'error': 'Game already in wishlist'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer l'entrée
        wishlist_item = Wishlist.objects.create(user=request.user, game=game)
        serializer = self.get_serializer(wishlist_item)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class WishlistRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, game_id):
        try:
            wishlist_item = Wishlist.objects.filter(user=request.user, game_id=game_id)
            if wishlist_item.exists():
                wishlist_item.delete()
                return Response(
                    {'message': 'Game removed from wishlist'}, 
                    status=status.HTTP_200_OK
                )
            return Response(
                {'error': 'Game not found in wishlist'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Developer Views
class DeveloperGameListView(generics.ListCreateAPIView):
    serializer_class = GameSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_developer() or self.request.user.is_staff:
            return Game.objects.filter(developer=self.request.user)
        return Game.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(developer=self.request.user)

class GameVersionUploadView(generics.CreateAPIView):
    serializer_class = GameVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return GameVersion.objects.filter(game__developer=self.request.user)
    
    def perform_create(self, serializer):
        game_id = self.kwargs.get('game_id')
        game = Game.objects.get(id=game_id)
        
        if self.request.user != game.developer and not self.request.user.is_staff:
            raise permissions.PermissionDenied("You don't own this game")
        
        serializer.save(game=game)

class GameStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        try:
            # Utiliser pk au lieu de game_id
            game = Game.objects.get(id=pk)
            
            # Vérifier que l'utilisateur est le développeur du jeu ou admin
            if request.user != game.developer and not request.user.is_staff:
                return Response(
                    {'error': 'You do not have permission to view these stats'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Récupérer les reviews
            reviews = game.reviews.filter(is_approved=True)
            
            # Calculer les statistiques
            stats = {
                'game_id': game.id,
                'title': game.title,
                'total_downloads': game.total_downloads,
                'total_owners': game.owners.count(),
                'average_rating': float(game.average_rating),
                'total_reviews': reviews.count(),
                'revenue': game.orderitem_set.filter(order__status='completed').aggregate(
                    total=Sum('price_paid')
                )['total'] or 0,
                'wishlist_count': game.wishlisted_by.count(),
                'playtime_stats': UserGame.objects.filter(game=game).aggregate(
                    total_playtime=Sum('playtime'),
                    average_playtime=Avg('playtime')
                ),
                'recent_reviews': [
                    {
                        'id': r.id,
                        'username': r.user.username,
                        'rating': r.rating,
                        'comment': r.comment[:200],
                        'created_at': r.created_at
                    }
                    for r in reviews.order_by('-created_at')[:5]
                ]
            }
            
            return Response(stats, status=status.HTTP_200_OK)
            
        except Game.DoesNotExist:
            return Response(
                {'error': 'Game not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error in GameStatsView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FeaturedGamesView(generics.ListAPIView):
    serializer_class = GameSerializer
    
    def get_queryset(self):
        return Game.objects.filter(
            status='featured',
            is_published=True,
            featured_until__gte=timezone.now()
        )[:10]

class SearchGamesView(generics.ListAPIView):
    serializer_class = GameSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'short_description']
    filterset_fields = ['categories__slug', 'price']
    ordering_fields = ['price', 'average_rating', 'release_date']
    
    def get_queryset(self):
        queryset = Game.objects.filter(is_published=True, status__in=['approved', 'featured'])
        
        # Price range filter
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset

class UserLibraryView(generics.ListAPIView):
    serializer_class = UserGameSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserGame.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def delete(self, request, pk=None):
        """Supprimer un jeu de la bibliothèque"""
        try:
            user_game = UserGame.objects.get(id=pk, user=request.user)
            user_game.delete()
            return Response({'message': 'Game removed from library'}, status=status.HTTP_200_OK)
        except UserGame.DoesNotExist:
            return Response({'error': 'Game not found in library'}, status=status.HTTP_404_NOT_FOUND)

class UpdateGameStatusView(APIView):
    """Mettre à jour le statut d'un jeu (installé, etc.)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, pk):
        try:
            user_game = UserGame.objects.get(id=pk, user=request.user)
            
            if 'is_installed' in request.data:
                user_game.is_installed = request.data['is_installed']
            if 'install_path' in request.data:
                user_game.install_path = request.data['install_path']
            if 'last_played' in request.data:
                user_game.last_played = request.data['last_played']
            
            user_game.save()
            
            return Response({
                'status': 'updated',
                'is_installed': user_game.is_installed,
                'install_path': user_game.install_path,
                'last_played': user_game.last_played
            }, status=status.HTTP_200_OK)
            
        except UserGame.DoesNotExist:
            return Response({'error': 'Game not found in library'}, status=status.HTTP_404_NOT_FOUND)

class DownloadGameView(APIView):
    """Générer une URL de téléchargement pour un jeu"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        try:
            user_game = UserGame.objects.get(id=pk, user=request.user)
            game = user_game.game
            
            # Vérifier si le fichier existe
            download_url = None
            if game.game_file:
                download_url = game.game_file.url
            
            return Response({
                'download_url': download_url,
                'file_size': game.file_size,
                'game_title': game.title,
                'game_id': game.id,
                'message': 'Download ready' if download_url else 'No download available'
            }, status=status.HTTP_200_OK)
            
        except UserGame.DoesNotExist:
            return Response({'error': 'Game not found in library'}, status=status.HTTP_404_NOT_FOUND)

class PlayGameView(APIView):
    """Enregistrer une session de jeu"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            user_game = UserGame.objects.get(id=pk, user=request.user)
            
            # Mettre à jour les statistiques de jeu
            user_game.last_played = timezone.now()
            user_game.playtime += 1  # Incrémenter de 1 minute (ou selon votre logique)
            user_game.save()
            
            return Response({
                'status': 'playing',
                'playtime': user_game.playtime,
                'last_played': user_game.last_played,
                'game_title': user_game.game.title
            }, status=status.HTTP_200_OK)
            
        except UserGame.DoesNotExist:
            return Response({'error': 'Game not found in library'}, status=status.HTTP_404_NOT_FOUND)

class RemoveFromLibraryView(APIView):
    """Supprimer un jeu de la bibliothèque"""
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, pk):
        try:
            user_game = UserGame.objects.get(id=pk, user=request.user)
            game_title = user_game.game.title
            user_game.delete()
            
            return Response({
                'message': f'{game_title} removed from library',
                'game_id': pk
            }, status=status.HTTP_200_OK)
            
        except UserGame.DoesNotExist:
            return Response({'error': 'Game not found in library'}, status=status.HTTP_404_NOT_FOUND)