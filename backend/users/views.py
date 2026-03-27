from venv import logger
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, UserProfile
from .serializers import UserSerializer, UserRegistrationSerializer, UserUpdateSerializer, UserProfileSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import json

import requests
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_control
import urllib.parse

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from .models import User
from .serializers import UserSerializer
from games.models import Game, Category, UserGame
from orders.models import Order, OrderItem
from reviews.models import Review
import logging

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Créer une copie des données
        data = request.data.copy()
        
        # Gérer les champs du profil utilisateur
        profile_data = {}
        profile_fields = ['website', 'location', 'social_links', 'preferences']
        
        for field in profile_fields:
            if field in data:
                value = data[field]
                # Si c'est une chaîne JSON, la parser
                if field == 'social_links' and isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except:
                        pass
                profile_data[field] = value
        
        # Supprimer les champs du profil des données utilisateur
        for field in profile_fields:
            if field in data:
                del data[field]
        
        # Mettre à jour l'utilisateur
        user_serializer = UserUpdateSerializer(instance, data=data, partial=partial)
        
        if user_serializer.is_valid():
            user_serializer.save()
            
            # Mettre à jour le profil
            if profile_data:
                profile, created = UserProfile.objects.get_or_create(user=instance)
                profile_serializer = UserProfileSerializer(
                    profile, 
                    data=profile_data, 
                    partial=partial
                )
                if profile_serializer.is_valid():
                    profile_serializer.save()
                else:
                    return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Retourner les données mises à jour
            updated_user = self.get_object()
            return Response(UserSerializer(updated_user).data)
        
        return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class UserStatsView(APIView):
    """Endpoint pour vérifier les statistiques de l'utilisateur"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        from games.models import UserGame
        from reviews.models import Review
        
        owned_games = UserGame.objects.filter(user=user)
        reviews = Review.objects.filter(user=user)
        
        return Response({
            'user_id': user.id,
            'username': user.username,
            'owned_games_count': owned_games.count(),
            'owned_games_list': [
                {
                    'id': ug.game.id,
                    'title': ug.game.title,
                    'purchased_at': ug.purchased_at
                } for ug in owned_games
            ],
            'reviews_count': reviews.count(),
            'reviews_list': [
                {
                    'id': r.id,
                    'game_title': r.game.title,
                    'rating': r.rating,
                    'comment': r.comment[:100]
                } for r in reviews
            ]
        })
    
class AdminStatsView(APIView):
    """Vue pour les statistiques admin"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # ===== STATISTIQUES UTILISATEURS =====
            total_users = User.objects.count()
            total_developers = User.objects.filter(role='developer').count()
            active_users = User.objects.filter(is_active=True).count()
            
            # ===== STATISTIQUES JEUX =====
            total_games = Game.objects.count()
            published_games = Game.objects.filter(is_published=True).count()
            pending_games = Game.objects.filter(status='pending').count()
            featured_games = Game.objects.filter(status='featured').count()
            
            # ===== STATISTIQUES REVENUS =====
            completed_orders = Order.objects.filter(status='completed')
            total_revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or 0
            platform_fee = float(total_revenue) * 0.3
            developer_payout = float(total_revenue) * 0.7
            
            # Revenus mensuels (12 derniers mois)
            monthly_revenue = []
            for i in range(11, -1, -1):
                date = timezone.now() - timedelta(days=30*i)
                month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if i == 0:
                    month_end = timezone.now()
                else:
                    next_month = date.replace(day=28) + timedelta(days=4)
                    month_end = next_month.replace(day=1)
                
                monthly_total = Order.objects.filter(
                    status='completed',
                    created_at__gte=month_start,
                    created_at__lt=month_end
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                monthly_revenue.append(float(monthly_total))
            
            # ===== STATISTIQUES REVIEWS =====
            total_reviews = Review.objects.count()
            approved_reviews = Review.objects.filter(is_approved=True).count()
            pending_reviews = Review.objects.filter(is_approved=False).count()
            reported_reviews = pending_reviews
            
            # ===== DISTRIBUTION PAR CATÉGORIE =====
            categories = Category.objects.annotate(
                game_count=Count('games')
            ).filter(game_count__gt=0)[:5]
            
            category_labels = [cat.name for cat in categories]
            category_data = [cat.game_count for cat in categories]
            
            # ===== TÉLÉCHARGEMENTS TOTAUX =====
            total_downloads = Game.objects.aggregate(total=Sum('total_downloads'))['total'] or 0
            
            # ===== TOP JEUX =====
            top_games = Game.objects.annotate(
                sales_count=Count('orderitem', filter=Q(orderitem__order__status='completed'))
            ).order_by('-sales_count')[:5]
            
            top_games_data = []
            for game in top_games:
                revenue = OrderItem.objects.filter(
                    game=game,
                    order__status='completed'
                ).aggregate(total=Sum('price_paid'))['total'] or 0
                top_games_data.append({
                    'id': game.id,
                    'title': game.title,
                    'sales': game.sales_count,
                    'revenue': float(revenue)
                })
            
            response_data = {
                'users': {
                    'total': total_users,
                    'developers': total_developers,
                    'active': active_users
                },
                'games': {
                    'total': total_games,
                    'published': published_games,
                    'pending': pending_games,
                    'featured': featured_games
                },
                'revenue': {
                    'total': float(total_revenue),
                    'platform_fee': platform_fee,
                    'developer_payout': developer_payout,
                    'monthly': monthly_revenue
                },
                'reviews': {
                    'total': total_reviews,
                    'approved': approved_reviews,
                    'pending': pending_reviews,
                    'reported': reported_reviews
                },
                'categories': {
                    'labels': category_labels,
                    'data': category_data
                },
                'downloads': total_downloads,
                'top_games': top_games_data
            }
            
            print("Admin stats response:", response_data)  # Debug log
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error fetching admin stats: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminUserStatsView(APIView):
    """Statistiques détaillées des utilisateurs"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Utilisateurs par rôle
        users_by_role = User.objects.values('role').annotate(count=Count('id'))
        
        # Nouveaux utilisateurs par mois
        monthly_users = []
        for i in range(11, -1, -1):
            date = timezone.now() - timedelta(days=30*i)
            month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i == 0:
                month_end = timezone.now()
            else:
                next_month = date.replace(day=28) + timedelta(days=4)
                month_end = next_month.replace(day=1)
            
            count = User.objects.filter(
                date_joined__gte=month_start,
                date_joined__lt=month_end
            ).count()
            monthly_users.append(count)
        
        return Response({
            'by_role': users_by_role,
            'monthly': monthly_users
        })


class AdminGameStatsView(APIView):
    """Statistiques détaillées des jeux"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Jeux par statut
        games_by_status = Game.objects.values('status').annotate(count=Count('id'))
        
        # Jeux par catégorie
        games_by_category = Category.objects.annotate(
            game_count=Count('games')
        ).values('name', 'game_count')
        
        # Top téléchargements
        top_downloads = Game.objects.order_by('-total_downloads')[:10].values('id', 'title', 'total_downloads')
        
        return Response({
            'by_status': games_by_status,
            'by_category': games_by_category,
            'top_downloads': top_downloads
        })


class AdminReviewStatsView(APIView):
    """Statistiques détaillées des reviews"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Reviews par note
        reviews_by_rating = Review.objects.values('rating').annotate(count=Count('id'))
        
        # Reviews par mois
        monthly_reviews = []
        for i in range(11, -1, -1):
            date = timezone.now() - timedelta(days=30*i)
            month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i == 0:
                month_end = timezone.now()
            else:
                next_month = date.replace(day=28) + timedelta(days=4)
                month_end = next_month.replace(day=1)
            
            count = Review.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).count()
            monthly_reviews.append(count)
        
        return Response({
            'by_rating': reviews_by_rating,
            'monthly': monthly_reviews
        })
    
@csrf_exempt
@cache_control(max_age=86400)  # Cache for 24 hours
def proxy_image(request):
    """Proxy pour les images externes pour éviter les problèmes CORS"""
    url = request.GET.get('url')
    
    if not url:
        return JsonResponse({'error': 'No URL provided'}, status=400)
    
    # Décoder l'URL si nécessaire
    try:
        decoded_url = urllib.parse.unquote(url)
        if not decoded_url.startswith('http'):
            decoded_url = 'https://' + decoded_url
    except:
        decoded_url = url
    
    try:
        # Télécharger l'image
        response = requests.get(decoded_url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Créer la réponse avec les bons headers
        image_response = HttpResponse(response.content, content_type=response.headers.get('content-type', 'image/jpeg'))
        image_response['Access-Control-Allow-Origin'] = '*'
        image_response['Cache-Control'] = 'public, max-age=86400'
        
        return image_response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)