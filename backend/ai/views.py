from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from games.models import Game, Category, UserGame
from orders.models import OrderItem
from reviews.models import Review
from games.serializers import GameSerializer
import random
from .models import UserPreference, GameSimilarity
from .ml_engine import ml_engine

# ==================== ENDPOINTS DE BASE ====================

class GameRecommendationsView(APIView):
    """Endpoint pour les recommandations de jeux"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Récupérer les préférences utilisateur
            try:
                preferences = UserPreference.objects.get(user=request.user)
                favorite_genres = preferences.favorite_genres
                price_min = preferences.price_range_min
                price_max = preferences.price_range_max
            except UserPreference.DoesNotExist:
                favorite_genres = []
                price_min = 0
                price_max = 100
            
            # Récupérer les jeux possédés par l'utilisateur
            owned_games = UserGame.objects.filter(user=request.user).values_list('game_id', flat=True)
            
            # Récupérer les jeux notés par l'utilisateur
            reviewed_games = Review.objects.filter(user=request.user).values_list('game_id', flat=True)
            
            # Jeux déjà connus
            known_games = set(list(owned_games) + list(reviewed_games))
            
            # Jeux disponibles avec filtre de prix
            available_games = Game.objects.filter(
                is_published=True, 
                status='approved',
                price__gte=price_min,
                price__lte=price_max
            ).exclude(id__in=known_games)
            
            # Filtrer par genres préférés
            if favorite_genres:
                available_games = available_games.filter(
                    categories__name__in=favorite_genres
                ).distinct()
            
            # Trier par popularité et note
            recommendations = []
            for game in available_games[:30]:
                # Score basé sur les préférences
                score = 0
                
                # Score de note
                score += float(game.average_rating) * 0.3
                
                # Score de popularité
                score += min(game.total_downloads / 1000, 1) * 0.2
                
                # Bonus pour les genres préférés
                game_genres = [cat.name for cat in game.categories.all()]
                genre_match = len(set(favorite_genres) & set(game_genres))
                score += (genre_match * 0.3)
                
                # Score de prix (préférence pour les jeux moins chers)
                price_score = 1 - min(game.price / 100, 1)
                score += price_score * 0.2
                
                # Générer une raison personnalisée
                reason = self._get_reason(game, favorite_genres, game_genres)
                
                recommendations.append({
                    'game': GameSerializer(game).data,
                    'score': score,
                    'reason': reason
                })
            
            # Trier par score
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            
            return Response({
                'recommendations': recommendations[:10],
                'total': len(recommendations)
            })
            
        except Exception as e:
            print(f"Error in recommendations: {str(e)}")
            return Response({
                'recommendations': [],
                'total': 0
            })
    
    def _get_reason(self, game, favorite_genres, game_genres):
        """Génère une raison personnalisée pour la recommandation"""
        if favorite_genres and set(favorite_genres) & set(game_genres):
            matching = list(set(favorite_genres) & set(game_genres))[0]
            return f"Because you like {matching} games"
        elif game.average_rating > 4.5:
            return "Highly rated by the community"
        elif game.total_downloads > 1000:
            return "Popular choice among gamers"
        else:
            return "You might enjoy this game"


class SimilarGamesView(APIView):
    """Endpoint pour les jeux similaires"""
    permission_classes = [AllowAny]
    
    def get(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
            
            game_categories = game.categories.all()
            similar_games = Game.objects.filter(
                is_published=True,
                status='approved'
            ).exclude(id=game_id).distinct()
            
            if game_categories.exists():
                similar_games = similar_games.filter(categories__in=game_categories)
            
            similar_list = []
            for similar in similar_games[:10]:
                common_categories = set(game_categories) & set(similar.categories.all())
                similarity = len(common_categories) / max(len(game_categories), 1)
                
                similar_list.append({
                    'game': GameSerializer(similar).data,
                    'similarity': similarity,
                    'common_categories': [cat.name for cat in common_categories]
                })
            
            similar_list.sort(key=lambda x: x['similarity'], reverse=True)
            
            return Response({
                'game': GameSerializer(game).data,
                'similar_games': similar_list[:8]
            })
            
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=404)


class UserPreferencesView(APIView):
    """Gestion des préférences utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Récupérer ou créer les préférences
            preferences, created = UserPreference.objects.get_or_create(user=request.user)
            
            return Response({
                'favorite_genres': preferences.favorite_genres,
                'price_range_min': preferences.price_range_min,
                'price_range_max': preferences.price_range_max,
                'play_style': preferences.play_style,
                'created': created
            })
        except Exception as e:
            print(f"Error getting preferences: {str(e)}")
            return Response({
                'favorite_genres': [],
                'price_range_min': 0,
                'price_range_max': 100,
                'play_style': 'casual'
            })
    
    def post(self, request):
        try:
            # Récupérer ou créer les préférences
            preferences, created = UserPreference.objects.get_or_create(user=request.user)
            
            # Mettre à jour les préférences
            if 'favorite_genres' in request.data:
                preferences.favorite_genres = request.data['favorite_genres']
            if 'price_range_min' in request.data:
                preferences.price_range_min = request.data['price_range_min']
            if 'price_range_max' in request.data:
                preferences.price_range_max = request.data['price_range_max']
            if 'play_style' in request.data:
                preferences.play_style = request.data['play_style']
            
            preferences.save()
            
            return Response({
                'message': 'Preferences updated successfully',
                'favorite_genres': preferences.favorite_genres,
                'price_range_min': preferences.price_range_min,
                'price_range_max': preferences.price_range_max,
                'play_style': preferences.play_style
            })
        except Exception as e:
            print(f"Error saving preferences: {str(e)}")
            return Response({'error': str(e)}, status=400)


class GameSentimentView(APIView):
    """Analyse des sentiments pour un jeu"""
    permission_classes = [AllowAny]
    
    def get(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
            reviews = Review.objects.filter(game=game, is_approved=True)[:50]
            
            # Analyse simple des sentiments
            positive_words = ['great', 'awesome', 'amazing', 'excellent', 'fantastic', 'good', 'love', 'enjoy']
            negative_words = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor', 'hate', 'boring']
            
            positive_count = 0
            negative_count = 0
            neutral_count = 0
            
            for review in reviews:
                text = review.comment.lower()
                pos_score = sum(1 for word in positive_words if word in text)
                neg_score = sum(1 for word in negative_words if word in text)
                
                if pos_score > neg_score:
                    positive_count += 1
                elif neg_score > pos_score:
                    negative_count += 1
                else:
                    neutral_count += 1
            
            total = reviews.count()
            sentiment_score = (positive_count - negative_count) / (total + 1) if total > 0 else 0
            
            return Response({
                'game_title': game.title,
                'total_reviews': total,
                'sentiment_breakdown': {
                    'positive': positive_count,
                    'negative': negative_count,
                    'neutral': neutral_count
                },
                'sentiment_score': sentiment_score,
                'reviews_analysis': []
            })
            
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=404)


class PricePredictionView(APIView):
    """Prédiction de prix basique"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
            
            # Prédiction basique
            rating = float(game.average_rating or 0)
            if rating >= 4.5:
                suggested_price = 29.99
            elif rating >= 4.0:
                suggested_price = 19.99
            elif rating >= 3.5:
                suggested_price = 14.99
            else:
                suggested_price = 9.99
            
            current_price = float(game.discount_price or game.price)
            
            diff = suggested_price - current_price
            if diff > 5:
                recommendation = "Undervalued - could increase price"
            elif diff < -5:
                recommendation = "Overpriced - consider discount"
            else:
                recommendation = "Fairly priced"
            
            return Response({
                'game_id': game.id,
                'title': game.title,
                'current_price': current_price,
                'predicted_price': suggested_price,
                'recommendation': recommendation
            })
            
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=404)


class TrendingGamesView(APIView):
    """Jeux tendances"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            games = Game.objects.filter(is_published=True, status='approved')
            
            trending = []
            for game in games:
                total_downloads = game.total_downloads or 0
                average_rating = float(game.average_rating) if game.average_rating else 0.0
                
                # Simuler des données
                new_owners = random.randint(0, 500)
                new_reviews = random.randint(0, 100)
                
                trend_score = (new_owners * 2) + (new_reviews * 1.5) + (total_downloads * 0.01)
                
                trending.append({
                    'game': {
                        'id': game.id,
                        'title': game.title,
                        'price': float(game.price),
                        'cover_image': game.cover_image,
                        'average_rating': average_rating,
                        'total_ratings': game.total_ratings or 0,
                        'total_downloads': total_downloads,
                        'short_description': game.short_description,
                        'categories': [{'id': cat.id, 'name': cat.name} for cat in game.categories.all()]
                    },
                    'trend_score': trend_score,
                    'new_owners': new_owners,
                    'new_reviews': new_reviews
                })
            
            trending.sort(key=lambda x: x['trend_score'], reverse=True)
            
            return Response({
                'trending_games': trending[:20]
            })
            
        except Exception as e:
            print(f"Error in trending: {str(e)}")
            return Response({'trending_games': []})


# ==================== ENDPOINTS ML AVANCÉS ====================

class AdvancedRecommendationsView(APIView):
    """Recommandations avancées avec ML"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Vérifier si le moteur ML est initialisé
            if ml_engine.game_features_matrix is None:
                ml_engine.build_content_features()
            
            recommendations = ml_engine.get_personalized_recommendations(
                request.user, 
                top_n=20
            )
            
            result = []
            for rec in recommendations:
                # S'assurer que le jeu a toutes les données nécessaires
                game_data = GameSerializer(rec['game']).data
                result.append({
                    'game': game_data,
                    'score': rec['score'],
                    'reason': rec['reason'],
                    'details': rec.get('details', {})
                })
            
            return Response({
                'recommendations': result,
                'total': len(result),
                'ml_ready': True
            })
            
        except Exception as e:
            print(f"Error in advanced recommendations: {str(e)}")
            # Fallback vers les recommandations basiques
            basic_recs = GameRecommendationsView().get(request)
            return basic_recs


class AdvancedPricePredictionView(APIView):
    """Prédiction de prix avancée avec ML"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
            
            # Prédiction ML avancée
            predicted_price = ml_engine.predict_price(game)
            current_price = float(game.discount_price or game.price)
            
            # Analyse de confiance
            similar_count = GameSimilarity.objects.filter(game1=game).count()
            confidence = min(0.95, 0.5 + similar_count / 50)
            
            # Différence
            diff = predicted_price - current_price
            
            # Recommandation avec emojis
            if diff > 5:
                recommendation = "🚀 Undervalued - Good opportunity!"
                color = "green"
                emoji = "🚀"
            elif diff < -5:
                recommendation = "💸 Overpriced - Consider waiting"
                color = "red"
                emoji = "💸"
            elif abs(diff) <= 2:
                recommendation = "✅ Fairly priced"
                color = "yellow"
                emoji = "✅"
            else:
                direction = "undervalued" if diff > 0 else "overpriced"
                recommendation = f"📊 Slightly {direction}"
                color = "orange"
                emoji = "📊"
            
            return Response({
                'game_id': game.id,
                'title': game.title,
                'current_price': current_price,
                'predicted_price': predicted_price,
                'difference': round(diff, 2),
                'recommendation': recommendation,
                'color': color,
                'emoji': emoji,
                'similar_games_count': similar_count,
                'confidence': round(confidence * 100, 1),
                'analysis': {
                    'rating_factor': round(float(game.average_rating or 0) / 5, 2),
                    'popularity_score': min(game.total_downloads / 1000, 1),
                    'similar_games': similar_count
                }
            })
            
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=404)


class TrainMLModelsView(APIView):
    """Endpoint pour entraîner les modèles ML"""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        try:
            ml_engine.build_content_features()
            ml_engine.train_price_predictor()
            ml_engine.train_trend_model()
            ml_engine.update_similarities()
            
            return Response({
                'status': 'success',
                'message': 'ML models trained successfully',
                'games_processed': len(ml_engine.game_ids) if ml_engine.game_ids else 0
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ModelStatsView(APIView):
    """Statistiques des modèles ML"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        return Response({
            'models_trained': {
                'content_features': ml_engine.game_features_matrix is not None,
                'price_model': ml_engine.price_model is not None,
                'trend_model': ml_engine.trend_model is not None,
                'svd_model': ml_engine.svd_model is not None,
                'kmeans_model': ml_engine.kmeans_model is not None
            },
            'games_indexed': len(ml_engine.game_ids) if ml_engine.game_ids else 0,
            'features_dimension': ml_engine.game_features_matrix.shape[1] if ml_engine.game_features_matrix is not None else 0
        })