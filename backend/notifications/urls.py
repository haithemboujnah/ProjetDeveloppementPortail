from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('mark-all-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-all-read'),
    path('<int:notification_id>/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
]