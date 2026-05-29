from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('stats/', views.AdminStatsView.as_view(), name='admin-stats'),
    path('stats/users/', views.AdminUserStatsView.as_view(), name='admin-user-stats'),
    path('stats/games/', views.AdminGameStatsView.as_view(), name='admin-game-stats'),
    path('stats/reviews/', views.AdminReviewStatsView.as_view(), name='admin-review-stats'),
    path('wallet/add/', views.AddWalletBalanceView.as_view(), name='add-wallet'),
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
]