from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReviewListView.as_view(), name='review-list'),
    path('<int:pk>/', views.ReviewDetailView.as_view(), name='review-detail'),
    path('<int:review_id>/helpful/', views.ReviewHelpfulView.as_view(), name='review-helpful'),
    path('<int:review_id>/reply/', views.ReviewReplyView.as_view(), name='review-reply'),
    path('<int:review_id>/reply/<int:reply_id>/', views.ReviewReplyView.as_view(), name='review-reply-detail'),
]