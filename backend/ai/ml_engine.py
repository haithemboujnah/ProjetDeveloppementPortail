import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.neighbors import NearestNeighbors
from sklearn.model_selection import train_test_split, cross_val_score
import lightgbm as lgb
import xgboost as xgb
import joblib
import os
from collections import defaultdict
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone
from games.models import Game, Category, UserGame
from orders.models import OrderItem
from reviews.models import Review
from ai.models import GameSimilarity, GameRecommendation

class AdvancedMLEngine:
    """Moteur ML avancé pour les recommandations et prédictions"""
    
    def __init__(self):
        self.tfidf_vectorizer = None
        self.game_features_matrix = None
        self.game_ids = None
        self.game_titles = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.svd_model = None
        self.kmeans_model = None
        self.nn_model = None
        self.price_model = None
        self.trend_model = None
        self.model_path = 'ai/models/'
        
        os.makedirs(self.model_path, exist_ok=True)
    
    def build_content_features(self):
        """Construit des caractéristiques avancées basées sur le contenu"""
        games = Game.objects.filter(is_published=True, status='approved').prefetch_related('categories')
        
        if not games.exists():
            return None
        
        game_data = []
        for game in games:
            text = f"{game.title} {game.description} {game.short_description}"
            
            categories = [cat.name for cat in game.categories.all()]
            
            features = {
                'id': game.id,
                'title': game.title,
                'text': text,
                'categories': categories,
                'price': float(game.price),
                'rating': float(game.average_rating),
                'downloads': game.total_downloads,
                'reviews_count': game.total_ratings,
                'has_discount': 1 if game.discount_price else 0,
                'discount_rate': (game.price - game.discount_price) / game.price if game.discount_price else 0,
                'days_since_release': (timezone.now() - game.release_date).days,
                'categories_count': len(categories)
            }
            game_data.append(features)
        
        df = pd.DataFrame(game_data)
        
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )
        text_features = self.tfidf_vectorizer.fit_transform(df['text'].fillna(''))
        
        category_vectors = self._encode_categories(df['categories'].tolist())
        
        numerical_features = df[['price', 'rating', 'downloads', 'reviews_count', 
                                  'has_discount', 'discount_rate', 'days_since_release', 
                                  'categories_count']].values
        numerical_features = self.scaler.fit_transform(numerical_features)
        
        from scipy.sparse import hstack
        self.game_features_matrix = hstack([text_features, category_vectors, numerical_features])
        self.game_ids = df['id'].tolist()
        self.game_titles = df['title'].tolist()
        
        self.svd_model = TruncatedSVD(n_components=100, random_state=42)
        self.game_features_matrix = self.svd_model.fit_transform(self.game_features_matrix)
        
        n_clusters = min(10, len(games) // 10 + 1)
        self.kmeans_model = KMeans(n_clusters=n_clusters, random_state=42)
        self.game_clusters = self.kmeans_model.fit_predict(self.game_features_matrix)
        
        self.nn_model = NearestNeighbors(n_neighbors=20, metric='cosine', algorithm='brute')
        self.nn_model.fit(self.game_features_matrix)
        
        return df
    
    def _encode_categories(self, categories_list, max_categories=50):
        """Encode les catégories en vecteur sparse"""
        from scipy.sparse import lil_matrix
        
        all_categories = set()
        for cats in categories_list:
            all_categories.update(cats)
        all_categories = list(all_categories)[:max_categories]
        cat_to_idx = {cat: i for i, cat in enumerate(all_categories)}
        
        n_samples = len(categories_list)
        n_cats = len(all_categories)
        cat_matrix = lil_matrix((n_samples, n_cats), dtype=np.float32)
        
        for i, cats in enumerate(categories_list):
            for cat in cats:
                if cat in cat_to_idx:
                    cat_matrix[i, cat_to_idx[cat]] = 1
        
        return cat_matrix.tocsr()
    
    def train_price_predictor(self):
        """Entraîne un modèle de prédiction de prix avancé"""
        games = Game.objects.filter(is_published=True, status='approved')
        
        if games.count() < 50:
            return
        
        features = []
        prices = []
        
        for game in games:
            rating = float(game.average_rating)
            downloads = game.total_downloads
            reviews = game.total_ratings
            categories_count = game.categories.count()
            price = float(game.price)
            
            conversion_rate = reviews / max(downloads, 1)
            
            days_old = (timezone.now() - game.release_date).days
            
            popularity_score = (downloads * 0.4) + (reviews * 0.3) + (rating * 100 * 0.3)
            
            features.append([
                rating,
                downloads,
                reviews,
                categories_count,
                conversion_rate,
                days_old,
                popularity_score
            ])
            prices.append(price)
        
        X = np.array(features)
        y = np.array(prices)
        
        X = self.scaler.fit_transform(X)
        
        self.price_model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        self.price_model.fit(X, y)
        
        joblib.dump(self.price_model, f'{self.model_path}price_model.pkl')
        
        return self.price_model
    
    def predict_price(self, game):
        """Prédit le prix optimal avec le modèle ML"""
        if self.price_model is None:
            try:
                self.price_model = joblib.load(f'{self.model_path}price_model.pkl')
            except:
                self.train_price_predictor()
        
        if self.price_model is None:
            return self._simple_price_prediction(game)
        
        rating = float(game.average_rating or 0)
        downloads = game.total_downloads or 0
        reviews = game.total_ratings or 0
        categories_count = game.categories.count()
        conversion_rate = reviews / max(downloads, 1)
        days_old = (timezone.now() - game.release_date).days
        popularity_score = (downloads * 0.4) + (reviews * 0.3) + (rating * 100 * 0.3)
        
        features = np.array([[
            rating, downloads, reviews, categories_count,
            conversion_rate, days_old, popularity_score
        ]])
        
        features = self.scaler.transform(features)
        predicted = self.price_model.predict(features)[0]
        
        predicted = max(4.99, min(69.99, predicted))
        
        predicted = round(predicted * 2) / 2
        if predicted > 0:
            predicted = round(predicted) - 0.01
        
        return round(predicted, 2)
    
    def _simple_price_prediction(self, game):
        """Prédiction simple de fallback"""
        rating = float(game.average_rating or 0)
        if rating >= 4.5:
            return 29.99
        elif rating >= 4.0:
            return 19.99
        elif rating >= 3.5:
            return 14.99
        else:
            return 9.99
    
    def train_trend_model(self):
        """Entraîne un modèle de prédiction de tendances"""
        games = Game.objects.filter(is_published=True, status='approved')
        
        if games.count() < 20:
            return
        
        features = []
        trends = []
        
        for game in games:
            rating = float(game.average_rating)
            downloads = game.total_downloads
            reviews = game.total_ratings
            days_old = (timezone.now() - game.release_date).days
            
            trend_score = (downloads * 0.4) + (reviews * 0.3) + (rating * 100 * 0.3)
            trend_score = trend_score / (days_old + 1)  
            
            features.append([rating, downloads, reviews, days_old])
            trends.append(trend_score)
        
        X = np.array(features)
        y = np.array(trends)
        
        X = self.scaler.fit_transform(X)
        
        self.trend_model = lgb.LGBMRegressor(
            n_estimators=100,
            max_depth=7,
            learning_rate=0.1,
            random_state=42
        )
        self.trend_model.fit(X, y)
        
        joblib.dump(self.trend_model, f'{self.model_path}trend_model.pkl')
    
    def predict_trend_score(self, game):
        """Prédit le score de tendance d'un jeu"""
        if self.trend_model is None:
            try:
                self.trend_model = joblib.load(f'{self.model_path}trend_model.pkl')
            except:
                self.train_trend_model()
        
        if self.trend_model is None:
            return (game.total_downloads * 0.4) + (game.total_ratings * 0.3) + (float(game.average_rating) * 100 * 0.3)
        
        rating = float(game.average_rating or 0)
        downloads = game.total_downloads or 0
        reviews = game.total_ratings or 0
        days_old = (timezone.now() - game.release_date).days
        
        features = np.array([[rating, downloads, reviews, days_old]])
        features = self.scaler.transform(features)
        
        return self.trend_model.predict(features)[0]
    
    def get_personalized_recommendations(self, user, top_n=20):
        """Recommandations personnalisées avancées"""

        owned_games = set(UserGame.objects.filter(user=user).values_list('game_id', flat=True))
        reviewed_games = set(Review.objects.filter(user=user).values_list('game_id', flat=True))
        purchased_games = set(OrderItem.objects.filter(order__user=user, order__status='completed').values_list('game_id', flat=True))
        
        known_games = owned_games | reviewed_games | purchased_games
        
        if self.game_features_matrix is None:
            self.build_content_features()
        
        if not known_games:
            return self._get_popular_games(top_n)
        
        user_profile = self._build_user_profile(user, known_games)
        
        all_games = Game.objects.filter(is_published=True, status='approved').exclude(id__in=known_games)
        
        recommendations = []
        for game in all_games[:200]:  
            content_score = self._get_content_similarity(user_profile, game)
            behavior_score = self._get_behavior_score(user, game)
            popularity_score = self._get_popularity_score(game)
            preference_score = self._get_preference_score(user, game)
            
            final_score = (content_score * 0.35) + (behavior_score * 0.25) + (popularity_score * 0.2) + (preference_score * 0.2)
            
            reason = self._generate_reason(content_score, behavior_score, preference_score, game)
            
            recommendations.append({
                'game': game,
                'score': final_score,
                'reason': reason,
                'details': {
                    'content': content_score,
                    'behavior': behavior_score,
                    'popularity': popularity_score,
                    'preference': preference_score
                }
            })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return recommendations[:top_n]
    
    def _build_user_profile(self, user, known_games):
        """Construit un profil utilisateur avancé"""
        if not known_games:
            return None
        
        games = Game.objects.filter(id__in=known_games)
        
        user_vector = np.zeros(self.game_features_matrix.shape[1])
        count = 0
        
        for game in games:
            if game.id in self.game_ids:
                idx = self.game_ids.index(game.id)
                user_vector += self.game_features_matrix[idx]
                count += 1
        
        if count > 0:
            user_vector /= count
        
        category_prefs = defaultdict(float)
        for game in games:
            for cat in game.categories.all():
                category_prefs[cat.name] += 1
        
        return {
            'vector': user_vector,
            'category_prefs': category_prefs,
            'games_count': len(known_games)
        }
    
    def _get_content_similarity(self, user_profile, game):
        """Calcule la similarité de contenu"""
        if user_profile is None or 'vector' not in user_profile:
            return 0.5
        
        if game.id not in self.game_ids:
            return 0
        
        idx = self.game_ids.index(game.id)
        game_vector = self.game_features_matrix[idx]
        
        similarity = cosine_similarity([user_profile['vector']], [game_vector])[0][0]
        
        return similarity
    
    def _get_behavior_score(self, user, game):
        """Score basé sur le comportement des utilisateurs similaires"""
        similar_users = self._find_similar_users(user)
        
        if not similar_users:
            return 0.5
        
        total_score = 0
        for similar_user, similarity in similar_users[:10]:
            if UserGame.objects.filter(user=similar_user, game=game).exists():
                total_score += similarity
        
        return min(1, total_score)
    
    def _find_similar_users(self, user):
        """Trouve des utilisateurs similaires"""
        user_games = set(UserGame.objects.filter(user=user).values_list('game_id', flat=True))
        
        if not user_games:
            return []
        
        similar_users = []
        other_users = UserGame.objects.exclude(user=user).values('user').annotate(count=Count('id'))
        
        for other in other_users:
            other_id = other['user']
            other_games = set(UserGame.objects.filter(user_id=other_id).values_list('game_id', flat=True))
            
            intersection = len(user_games & other_games)
            if intersection > 0:
                similarity = intersection / max(len(user_games), len(other_games))
                similar_users.append((other_id, similarity))
        
        similar_users.sort(key=lambda x: x[1], reverse=True)
        
        return similar_users[:20]
    
    def _get_popularity_score(self, game):
        """Score de popularité normalisé"""
        max_downloads = Game.objects.aggregate(max=Sum('total_downloads'))['max'] or 1
        popularity = min(game.total_downloads / max_downloads, 1)
        return popularity
    
    def _get_preference_score(self, user, game):
        """Score basé sur les préférences utilisateur"""
        try:
            preferences = user.preferences
            favorite_genres = preferences.favorite_genres
            
            if not favorite_genres:
                return 0.5
            
            game_genres = [cat.name for cat in game.categories.all()]
            match_count = len(set(favorite_genres) & set(game_genres))
            
            return match_count / max(len(favorite_genres), 1)
            
        except:
            return 0.5
    
    def _generate_reason(self, content_score, behavior_score, preference_score, game):
        """Génère une raison personnalisée pour la recommandation"""
        if content_score > 0.8:
            return "Very similar to games you've played"
        elif behavior_score > 0.7:
            return "Players like you enjoyed this"
        elif preference_score > 0.6:
            matching_genre = self._get_matching_genre(game)
            return f"Because you like {matching_genre} games"
        elif game.average_rating > 4.5:
            return "Highly rated by the community"
        elif game.total_downloads > 5000:
            return "Popular choice among gamers"
        else:
            return "You might enjoy this game"
    
    def _get_matching_genre(self, game):
        """Récupère un genre correspondant"""
        try:
            preferences = game.developer.user.preferences
            if preferences.favorite_genres:
                game_genres = [cat.name for cat in game.categories.all()]
                for genre in preferences.favorite_genres:
                    if genre in game_genres:
                        return genre
        except:
            pass
        return "this"
    
    def _get_popular_games(self, top_n):
        """Retourne les jeux populaires"""
        games = Game.objects.filter(is_published=True, status='approved').order_by('-total_downloads')[:top_n]
        return [{'game': game, 'score': 1 - i/top_n, 'reason': 'Popular choice'} for i, game in enumerate(games)]
    
    def update_similarities(self):
        """Met à jour les similarités entre jeux"""
        if self.game_features_matrix is None:
            self.build_content_features()
        
        similarities = cosine_similarity(self.game_features_matrix)
        
        for i, game_id in enumerate(self.game_ids):
            similar_indices = similarities[i].argsort()[::-1][1:11]
            for j, similar_idx in enumerate(similar_indices):
                similar_game_id = self.game_ids[similar_idx]
                similarity_score = similarities[i][similar_idx]
                
                GameSimilarity.objects.update_or_create(
                    game1_id=game_id,
                    game2_id=similar_game_id,
                    defaults={'similarity_score': similarity_score}
                )
        
        return True

ml_engine = AdvancedMLEngine()