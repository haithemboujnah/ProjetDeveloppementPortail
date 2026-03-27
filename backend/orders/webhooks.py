import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from .models import Order, OrderItem
from games.models import Game, UserGame
from notifications.models import Notification
import json

stripe.api_key = settings.STRIPE_SECRET_KEY

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_successful_payment(payment_intent)
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    
    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']
        handle_refund(charge)

    return HttpResponse(status=200)

@transaction.atomic
def handle_successful_payment(payment_intent):
    """Handle successful payment"""
    # Get metadata
    metadata = payment_intent.get('metadata', {})
    user_id = metadata.get('user_id')
    game_ids = metadata.get('game_ids', '').split(',')
    
    if not user_id or not game_ids:
        return
    
    # Get games
    games = Game.objects.filter(id__in=game_ids)
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        
        # Check if order already exists
        existing_order = Order.objects.filter(
            stripe_payment_intent=payment_intent['id'],
            status='completed'
        ).exists()
        
        if existing_order:
            return
        
        # Create order
        total = sum(game.get_final_price() for game in games)
        order = Order.objects.create(
            user=user,
            total_amount=total,
            status='completed',
            stripe_payment_intent=payment_intent['id']
        )
        
        # Create order items and add games to library
        for game in games:
            OrderItem.objects.create(
                order=order,
                game=game,
                price_paid=game.get_final_price()
            )
            
            # Add to user's library if not already owned
            UserGame.objects.get_or_create(
                user=user,
                game=game
            )
        
        # Create notification
        Notification.objects.create(
            user=user,
            title='Purchase Successful',
            message=f'You have successfully purchased {len(games)} game(s).',
            notification_type='success',
            link=f'/orders/{order.id}'
        )
        
        # Send email via Celery
        from .tasks import send_order_confirmation_email
        send_order_confirmation_email.delay(order.id)
        
    except Exception as e:
        # Log error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error processing payment: {e}")

def handle_failed_payment(payment_intent):
    """Handle failed payment"""
    metadata = payment_intent.get('metadata', {})
    user_id = metadata.get('user_id')
    
    if user_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=user_id)
            Notification.objects.create(
                user=user,
                title='Payment Failed',
                message='Your payment failed. Please try again or contact support.',
                notification_type='error'
            )
        except User.DoesNotExist:
            pass

def handle_refund(charge):
    """Handle refund"""
    payment_intent_id = charge.get('payment_intent')
    if payment_intent_id:
        try:
            order = Order.objects.get(stripe_payment_intent=payment_intent_id)
            order.status = 'refunded'
            order.save()
            
            # Remove games from user's library
            from games.models import UserGame
            UserGame.objects.filter(
                user=order.user,
                game__in=order.items.values_list('game', flat=True)
            ).delete()
            
            # Notify user
            Notification.objects.create(
                user=order.user,
                title='Order Refunded',
                message=f'Your order {order.order_number} has been refunded.',
                notification_type='warning'
            )
            
        except Order.DoesNotExist:
            pass