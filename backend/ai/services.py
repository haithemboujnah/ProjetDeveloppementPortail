import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from collections import defaultdict
from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone
from datetime import timedelta
from games.models import Game, Category, UserGame
from orders.models import OrderItem
from reviews.models import Review
import joblib
import os

class GameRecommender:
    """Système de recommandation de jeux basé sur le contenu et le comportement"""
    
    def __init__(self):
        self.tfidf_vectorizer = None
        self.game_features = None
        self.game_ids = None
        self.scaler = MinMaxScaler()
        
    def build_game_features(self):
        """Construit les caractéristiques des jeux pour la recommandation"""
        games = Game.objects.filter(is_published=True, status='approved')
        
        if not games.exists():
            return None
        
        game_data = []
        for game in games:
            # Collecter les catégories
            categories = " ".join([cat.name for cat in game.categories.all()])
            
            # Créer une description enrichie
            features = f"{game.title} {categories} {game.description} {game.short_description}"
            
            game_data.append({
                'id': game.id,
                'title': game.title,
                'features': features,
                'price': float(game.price),
                'rating': float(game.average_rating),
                'downloads': game.total_downloads,
                'categories': [cat.name for cat in game.categories.all()]
            })
        
        df = pd.DataFrame(game_data)
        
        # Vectorisation TF-IDF
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        self.game_features = self.tfidf_vectorizer.fit_transform(df['features'].fillna(''))
        self.game_ids = df['id'].tolist()
        
        return df
    
    def get_similar_games(self, game_id, top_n=10):
        """Trouve des jeux similaires à un jeu donné"""
        if self.game_features is None:
            self.build_game_features()
        
        if game_id not in self.game_ids:
            return []
        
        idx = self.game_ids.index(game_id)
        similarity_scores = cosine_similarity(self.game_features[idx:idx+1], self.game_features).flatten()
        
        # Trier par score de similarité
        similar_indices = similarity_scores.argsort()[::-1][1:top_n+1]
        
        similar_games = []
        for i in similar_indices:
            similar_games.append({
                'game_id': self.game_ids[i],
                'score': float(similarity_scores[i])
            })
        
        return similar_games
    
    def recommend_for_user(self, user, top_n=10):
        """Recommande des jeux pour un utilisateur"""
        # Récupérer les jeux possédés par l'utilisateur
        owned_games = UserGame.objects.filter(user=user).values_list('game_id', flat=True)
        
        # Récupérer les jeux notés par l'utilisateur
        reviewed_games = Review.objects.filter(user=user).values_list('game_id', flat=True)
        
        # Récupérer les jeux achetés
        purchased_games = OrderItem.objects.filter(
            order__user=user,
            order__status='completed'
        ).values_list('game_id', flat=True)
        
        # Combiner tous les jeux déjà connus
        known_games = set(list(owned_games) + list(reviewed_games) + list(purchased_games))
        
        # Récupérer les préférences de l'utilisateur
        try:
            preferences = user.preferences
            favorite_genres = preferences.favorite_genres
        except:
            favorite_genres = []
        
        # Récupérer tous les jeux non connus
        available_games = Game.objects.filter(
            is_published=True,
            status='approved'
        ).exclude(id__in=known_games)
        
        # Calculer les scores pour chaque jeu
        recommendations = []
        
        if self.game_features is None:
            self.build_game_features()
        
        for game in available_games:
            score = 0
            
            # Score basé sur les catégories préférées
            game_categories = [cat.name for cat in game.categories.all()]
            if favorite_genres:
                genre_match = len(set(favorite_genres) & set(game_categories))
                score += genre_match * 0.3
            
            # Score basé sur la note moyenne
            score += (float(game.average_rating) / 5) * 0.2
            
            # Score basé sur la popularité
            popularity = min(game.total_downloads / 1000, 1)
            score += popularity * 0.15
            
            # Score basé sur le prix (préférence pour les jeux moins chers)
            price_score = 1 - min(game.price / 100, 1)
            score += price_score * 0.1
            
            recommendations.append({
                'game': game,
                'score': score,
                'reason': self._get_reason(score, favorite_genres, game_categories)
            })
        
        # Trier par score et prendre les top_n
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return recommendations[:top_n]
    
    def _get_reason(self, score, favorite_genres, game_categories):
        """Génère une raison pour la recommandation"""
        if favorite_genres and set(favorite_genres) & set(game_categories):
            matching = list(set(favorite_genres) & set(game_categories))[0]
            return f"Because you like {matching} games"
        elif score > 0.7:
            return "Highly rated by the community"
        elif score > 0.5:
            return "Popular choice"
        else:
            return "You might enjoy this"

class CollaborativeFilter:
    """Filtrage collaboratif basé sur les comportements similaires"""
    
    def __init__(self):
        self.user_game_matrix = None
        self.user_similarity = None
        self.users = []
        self.games = []
    
    def build_matrix(self):
        """Construit la matrice utilisateur-jeu"""
        from games.models import UserGame
        
        # Récupérer tous les utilisateurs avec des jeux
        user_games = UserGame.objects.select_related('user', 'game')
        
        # Créer un mapping utilisateur -> index
        self.users = list(set(ug.user for ug in user_games))
        self.games = list(set(ug.game for ug in user_games))
        
        user_index = {user.id: i for i, user in enumerate(self.users)}
        game_index = {game.id: i for i, game in enumerate(self.games)}
        
        # Créer la matrice utilisateur-jeu
        matrix = np.zeros((len(self.users), len(self.games)))
        
        for ug in user_games:
            matrix[user_index[ug.user.id], game_index[ug.game.id]] = 1
        
        self.user_game_matrix = matrix
        
        # Calculer la similarité entre utilisateurs
        self.user_similarity = cosine_similarity(matrix)
        
        return matrix
    
    def get_collaborative_recommendations(self, user, top_n=10):
        """Recommandations basées sur les utilisateurs similaires"""
        if self.user_similarity is None:
            self.build_matrix()
        
        user_index = None
        for i, u in enumerate(self.users):
            if u.id == user.id:
                user_index = i
                break
        
        if user_index is None:
            return []
        
        # Trouver les utilisateurs similaires
        similar_users = self.user_similarity[user_index]
        similar_indices = similar_users.argsort()[::-1][1:11]
        
        # Jeux joués par l'utilisateur
        user_games = set(UserGame.objects.filter(user=user).values_list('game_id', flat=True))
        
        # Scores pour les jeux non joués
        game_scores = defaultdict(float)
        
        for similar_idx in similar_indices:
            similarity = similar_users[similar_idx]
            similar_user = self.users[similar_idx]
            
            similar_user_games = UserGame.objects.filter(user=similar_user).exclude(game_id__in=user_games)
            
            for ug in similar_user_games:
                game_scores[ug.game.id] += similarity
        
        # Convertir en liste
        recommendations = [
            {'game_id': game_id, 'score': score}
            for game_id, score in sorted(game_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        ]
        
        return recommendations

class SentimentAnalyzer:
    """Analyse de sentiment pour les reviews"""
    
    def __init__(self):
        self.positive_words = {
            'amazing', 'awesome', 'great', 'excellent', 'fantastic', 'wonderful', 
            'perfect', 'brilliant', 'outstanding', 'superb', 'incredible', 'love',
            'recommend', 'enjoy', 'fun', 'addictive', 'masterpiece', 'beautiful',
            'gorgeous', 'immersive', 'engaging', 'captivating', 'exciting'
        }
        
        self.negative_words = {
            'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor',
            'boring', 'trash', 'waste', 'broken', 'buggy', 'unplayable',
            'frustrating', 'mediocre', 'overpriced', 'lazy', 'rushed'
        }
    
    def analyze(self, text):
        """Analyse le sentiment d'un texte"""
        text_lower = text.lower()
        words = set(text_lower.split())
        
        positive_count = len(words & self.positive_words)
        negative_count = len(words & self.negative_words)
        
        if positive_count > negative_count:
            sentiment = 'positive'
            score = positive_count / (positive_count + negative_count + 1)
        elif negative_count > positive_count:
            sentiment = 'negative'
            score = -negative_count / (positive_count + negative_count + 1)
        else:
            sentiment = 'neutral'
            score = 0
        
        return {
            'sentiment': sentiment,
            'score': score,
            'positive_count': positive_count,
            'negative_count': negative_count
        }
    
    def batch_analyze(self, reviews):
        """Analyse un lot de reviews"""
        results = []
        for review in reviews:
            analysis = self.analyze(review.comment)
            results.append({
                'review_id': review.id,
                'sentiment': analysis['sentiment'],
                'score': analysis['score']
            })
        return results

class PricePredictor:
    """Prédiction de prix optimal pour les jeux"""
    
    def __init__(self):
        self.model = None
        
    def train(self):
        """Entraîne le modèle de prédiction de prix"""
        games = Game.objects.filter(is_published=True, status='approved')
        
        if games.count() < 10:
            return
        
        data = []
        for game in games:
            # Caractéristiques
            rating = float(game.average_rating)
            downloads = game.total_downloads
            categories_count = game.categories.count()
            reviews_count = game.total_ratings
            
            # Prix actuel
            price = float(game.price)
            
            data.append({
                'rating': rating,
                'downloads': downloads,
                'categories': categories_count,
                'reviews': reviews_count,
                'price': price
            })
        
        df = pd.DataFrame(data)
        
        # Normaliser les caractéristiques
        features = df[['rating', 'downloads', 'categories', 'reviews']].values
        prices = df['price'].values
        
        # Simple modèle basé sur la moyenne pondérée
        # Plus de poids pour les notes et téléchargements
        weights = [0.4, 0.3, 0.1, 0.2]
        
        self.model = {
            'weights': weights,
            'mean_price': prices.mean(),
            'std_price': prices.std()
        }
        
        return self.model
    
    def predict_price(self, game):
        """Prédit le prix optimal pour un jeu"""
        if self.model is None:
            self.train()
        
        if self.model is None:
            return 19.99  # Prix par défaut
        
        rating = float(game.average_rating or 0)
        downloads = min(game.total_downloads / 10000, 1)
        categories = min(game.categories.count() / 5, 1)
        reviews = min(game.total_ratings / 1000, 1)
        
        features = [rating / 5, downloads, categories, reviews]
        
        # Calcul du prix recommandé
        recommended_price = sum(f * w for f, w in zip(features, self.model['weights']))
        recommended_price = recommended_price * self.model['mean_price'] * 1.5
        
        # Limiter le prix entre 4.99 et 69.99
        recommended_price = max(4.99, min(69.99, recommended_price))
        
        return round(recommended_price, 2)