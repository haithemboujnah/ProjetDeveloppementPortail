from django.urls import path
from . import views

urlpatterns = [
    # Endpoints basiques
    path('recommendations/', views.GameRecommendationsView.as_view(), name='game-recommendations'),
    path('similar/<int:game_id>/', views.SimilarGamesView.as_view(), name='similar-games'),
    path('preferences/', views.UserPreferencesView.as_view(), name='user-preferences'),
    path('sentiment/<int:game_id>/', views.GameSentimentView.as_view(), name='game-sentiment'),
    path('price-prediction/<int:game_id>/', views.PricePredictionView.as_view(), name='price-prediction'),
    path('trending/', views.TrendingGamesView.as_view(), name='trending-games'),
    
    # Endpoints ML avancés
    path('advanced-recommendations/', views.AdvancedRecommendationsView.as_view(), name='advanced-recommendations'),
    path('advanced-price-prediction/<int:game_id>/', views.AdvancedPricePredictionView.as_view(), name='advanced-price-prediction'),
    path('train-models/', views.TrainMLModelsView.as_view(), name='train-models'),
    path('model-stats/', views.ModelStatsView.as_view(), name='model-stats'),
]