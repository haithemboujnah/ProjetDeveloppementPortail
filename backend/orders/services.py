import stripe
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import Order, OrderItem
from games.models import UserGame
from notifications.models import Notification
import logging

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    """Service for handling Stripe payments"""
    
    @staticmethod
    def create_payment_intent(user, games):
        """Create a payment intent for a purchase"""
        try:
            total = sum(game.get_final_price() for game in games)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(total * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'user_id': user.id,
                    'user_email': user.email,
                    'game_ids': ','.join(str(game.id) for game in games),
                    'game_titles': ','.join(game.title for game in games)
                },
                receipt_email=user.email,
                description=f'Purchase of {len(games)} game(s) on Steam Clone'
            )
            
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'total_amount': total
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise
    
    @staticmethod
    def confirm_payment(payment_intent_id):
        """Confirm and process a successful payment"""
        try:
            # Retrieve the payment intent
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'succeeded':
                return {'error': 'Payment not successful', 'status': intent.status}
            
            # Get metadata
            metadata = intent.metadata
            user_id = metadata.get('user_id')
            game_ids = metadata.get('game_ids', '').split(',')
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user = User.objects.get(id=user_id)
            games = Game.objects.filter(id__in=game_ids)
            
            # Check if order already exists
            existing_order = Order.objects.filter(
                stripe_payment_intent=payment_intent_id
            ).first()
            
            if existing_order:
                return {
                    'success': True,
                    'order': existing_order,
                    'message': 'Order already processed'
                }
            
            # Create order
            total = sum(game.get_final_price() for game in games)
            order = Order.objects.create(
                user=user,
                total_amount=total,
                status='completed',
                stripe_payment_intent=payment_intent_id,
                completed_at=timezone.now()
            )
            
            # Create order items and add to library
            for game in games:
                OrderItem.objects.create(
                    order=order,
                    game=game,
                    price_paid=game.get_final_price()
                )
                
                # Add to user's library
                UserGame.objects.get_or_create(
                    user=user,
                    game=game
                )
            
            # Create notification
            Notification.objects.create(
                user=user,
                title='Purchase Successful! 🎉',
                message=f'You have successfully purchased {len(games)} game(s). Check your library to start playing!',
                notification_type='success',
                link=f'/orders/{order.id}'
            )
            
            # Send confirmation email
            StripeService.send_order_confirmation_email(order)
            
            return {
                'success': True,
                'order': order,
                'message': 'Order completed successfully'
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            return {'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def send_order_confirmation_email(order):
        """Send order confirmation email"""
        try:
            subject = f'Order Confirmation - {order.order_number}'
            message = render_to_string('emails/order_confirmation.html', {
                'order': order,
                'user': order.user,
                'site_name': 'Steam Clone',
                'site_url': 'http://localhost:3000'
            })
            send_mail(
                subject,
                '',
                settings.DEFAULT_FROM_EMAIL,
                [order.user.email],
                html_message=message,
                fail_silently=False,
            )
            logger.info(f"Confirmation email sent for order {order.order_number}")
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {e}")
    
    @staticmethod
    def create_refund(payment_intent_id, amount=None):
        """Process a refund"""
        try:
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id,
                amount=int(amount * 100) if amount else None,
                reason='requested_by_customer'
            )
            
            # Update order status
            order = Order.objects.filter(stripe_payment_intent=payment_intent_id).first()
            if order:
                order.status = 'refunded'
                order.save()
                
                # Remove games from user's library
                UserGame.objects.filter(
                    user=order.user,
                    game__in=order.items.values_list('game', flat=True)
                ).delete()
                
                # Notify user
                Notification.objects.create(
                    user=order.user,
                    title='Order Refunded',
                    message=f'Your order {order.order_number} has been refunded successfully.',
                    notification_type='warning',
                    link=f'/orders/{order.id}'
                )
            
            return refund
            
        except stripe.error.StripeError as e:
            logger.error(f"Refund error: {e}")
            raise
    
    @staticmethod
    def get_payment_status(payment_intent_id):
        """Get payment status"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                'status': intent.status,
                'amount': intent.amount / 100,
                'currency': intent.currency,
                'created': intent.created
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving payment status: {e}")
            raise

# Import at the end to avoid circular imports
from django.utils import timezone
from games.models import Game