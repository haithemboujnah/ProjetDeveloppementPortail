from django.urls import path
from . import views

urlpatterns = [
    # Games
    path('', views.GameListView.as_view(), name='game-list'),
    path('search/', views.SearchGamesView.as_view(), name='game-search'),
    path('featured/', views.FeaturedGamesView.as_view(), name='featured-games'),
    path('my-library/', views.UserLibraryView.as_view(), name='user-library'),
    path('developer/games/', views.DeveloperGameListView.as_view(), name='developer-games'),
    path('<int:pk>/', views.GameDetailView.as_view(), name='game-detail'),
    path('<int:pk>/stats/', views.GameStatsView.as_view(), name='game-stats'),
    path('<int:game_id>/upload-version/', views.GameVersionUploadView.as_view(), name='upload-version'),
    
    # User Library Actions (utiliser des vues séparées)
    path('my-library/<int:pk>/update/', views.UpdateGameStatusView.as_view(), name='update-game-status'),
    path('my-library/<int:pk>/download/', views.DownloadGameView.as_view(), name='download-game'),
    path('my-library/<int:pk>/play/', views.PlayGameView.as_view(), name='play-game'),
    path('my-library/<int:pk>/remove/', views.RemoveFromLibraryView.as_view(), name='remove-from-library'),
    
    # Developer Routes
    path('developer/games/', views.DeveloperGameListView.as_view(), name='developer-games'),
    path('developer/games/<int:pk>/stats/', views.GameStatsView.as_view(), name='game-stats'),
    
    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    
    # Wishlist
    path('wishlist/', views.WishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:game_id>/remove/', views.WishlistRemoveView.as_view(), name='wishlist-remove'),

    path('test-categories/', views.test_categories, name='test-categories'),
]