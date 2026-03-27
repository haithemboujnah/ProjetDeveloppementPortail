from django.urls import path
from . import views
from .webhooks import stripe_webhook

urlpatterns = [
    path('', views.OrderListView.as_view(), name='order-list'),
    path('create/', views.OrderCreateView.as_view(), name='order-create'),
    path('create-payment-intent/', views.CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('confirm-order/', views.ConfirmOrderView.as_view(), name='confirm-order'),
    path('webhook/stripe/', stripe_webhook, name='stripe-webhook'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
]