import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from reviews import serializers
from .models import Order, OrderItem
from games.models import Game, UserGame
from .serializers import OrderSerializer, OrderCreateSerializer
from notifications.models import Notification

stripe.api_key = settings.STRIPE_SECRET_KEY

# Import the StripeService
try:
    from .services import StripeService
except ImportError:
    # Create a simple fallback if services.py doesn't exist
    class StripeService:
        @staticmethod
        def create_payment_intent(user, games):
            total = sum(game.get_final_price() for game in games)
            intent = stripe.PaymentIntent.create(
                amount=int(total * 100),
                currency='usd',
                metadata={
                    'user_id': user.id,
                    'game_ids': ','.join(str(game.id) for game in games)
                }
            )
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'total_amount': total
            }
        
        @staticmethod
        def confirm_payment(payment_intent_id):
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status != 'succeeded':
                return {'error': 'Payment not successful'}
            
            # Simple implementation
            return {'success': True, 'intent': intent}

class OrderListView(generics.ListAPIView):
    """List all orders for the current user or all orders for admin"""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all().order_by('-created_at')
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

class OrderCreateView(generics.CreateAPIView):
    """Create a new order"""
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @transaction.atomic
    def perform_create(self, serializer):
        # Get games from validated data
        games = serializer.validated_data.get('games', [])
        
        if not games:
            raise serializers.ValidationError("No games selected")
        
        # Check if user already owns any of these games
        owned_games = UserGame.objects.filter(
            user=self.request.user,
            game__in=games
        ).values_list('game_id', flat=True)
        
        if owned_games:
            owned_titles = Game.objects.filter(id__in=owned_games).values_list('title', flat=True)
            raise serializers.ValidationError({
                'owned_games': f"You already own: {', '.join(owned_titles)}"
            })
        
        # Calculate total amount
        total = sum(game.get_final_price() for game in games)
        
        # Create order
        order = serializer.save(
            user=self.request.user,
            total_amount=total,
            status='pending'
        )
        
        # Create order items
        for game in games:
            OrderItem.objects.create(
                order=order,
                game=game,
                price_paid=game.get_final_price()
            )
        
        # Create notification
        Notification.objects.create(
            user=self.request.user,
            title='Order Created',
            message=f'Your order #{order.order_number} has been created. Complete payment to get your games.',
            notification_type='info',
            link=f'/orders/{order.id}'
        )

class OrderDetailView(generics.RetrieveAPIView):
    """Get details of a specific order"""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)

class CreatePaymentIntentView(APIView):
    """Create a Stripe payment intent"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        game_ids = request.data.get('game_ids', [])
        
        if not game_ids:
            return Response({'error': 'No games selected'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get games
        games = Game.objects.filter(id__in=game_ids, is_published=True, status__in=['approved', 'featured'])
        
        if not games:
            return Response({'error': 'No valid games found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user already owns any of these games
        owned_games = UserGame.objects.filter(
            user=request.user,
            game__in=games
        ).values_list('game_id', flat=True)
        
        if owned_games:
            owned_titles = Game.objects.filter(id__in=owned_games).values_list('title', flat=True)
            return Response({
                'error': 'You already own some of these games',
                'owned_games': list(owned_titles)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create payment intent with Stripe
            total = sum(game.get_final_price() for game in games)
            
            intent = stripe.PaymentIntent.create(
                amount=int(total * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'user_id': request.user.id,
                    'user_email': request.user.email,
                    'game_ids': ','.join(str(game.id) for game in games),
                    'game_titles': ','.join(game.title for game in games)
                },
                receipt_email=request.user.email,
                description=f'Purchase of {len(games)} game(s) on Steam Clone'
            )
            
            return Response({
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'total_amount': float(total)
            })
            
        except stripe.error.CardError as e:
            return Response({'error': f'Card error: {e.error.message}'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            return Response({'error': f'Stripe error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConfirmOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response({'error': 'Payment intent ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'succeeded':
                return Response({
                    'error': 'Payment not successful',
                    'status': intent.status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get metadata
            metadata = intent.metadata
            user_id = metadata.get('user_id')
            game_ids = metadata.get('game_ids', '').split(',')
            
            # Verify user matches
            if int(user_id) != request.user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            # Get games
            games = Game.objects.filter(id__in=game_ids)
            
            # Calculate total
            total = sum(game.get_final_price() for game in games)
            
            # Vérifier le solde de l'utilisateur
            if request.user.wallet_balance < total:
                # Rembourser Stripe
                refund = stripe.Refund.create(
                    payment_intent=payment_intent_id,
                    reason='requested_by_customer'
                )
                return Response({
                    'error': 'Insufficient balance',
                    'balance': float(request.user.wallet_balance),
                    'required': float(total)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if order already exists
            existing_order = Order.objects.filter(stripe_payment_intent=payment_intent_id).first()
            if existing_order:
                return Response({
                    'message': 'Order already processed',
                    'order_id': existing_order.id,
                    'order_number': existing_order.order_number
                })
            
            # DÉBITER LE PORTEFEUILLE
            request.user.wallet_balance -= total
            request.user.save()
            
            # Create order
            order = Order.objects.create(
                user=request.user,
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
                
                # Add game to user's library
                UserGame.objects.get_or_create(
                    user=request.user,
                    game=game
                )
                
                # Update game download count
                game.total_downloads += 1
                game.save()
            
            # Create success notification
            Notification.objects.create(
                user=request.user,
                title='Purchase Successful! 🎉',
                message=f'You have successfully purchased {len(games)} game(s). ${total} has been deducted from your wallet.',
                notification_type='success',
                link=f'/orders/{order.id}'
            )
            
            return Response({
                'success': True,
                'message': 'Order completed successfully',
                'order_id': order.id,
                'order_number': order.order_number,
                'total_amount': float(order.total_amount),
                'new_balance': float(request.user.wallet_balance)
            })
            
        except stripe.error.StripeError as e:
            return Response({'error': f'Stripe error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RefundOrderView(APIView):
    """Process a refund for an order"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id, user=request.user)
            
            # Check if order can be refunded (within 14 days)
            days_since_purchase = (timezone.now() - order.created_at).days
            if days_since_purchase > 14:
                return Response({
                    'error': 'Refunds are only available within 14 days of purchase'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if already refunded
            if order.status == 'refunded':
                return Response({'error': 'Order already refunded'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Process refund with Stripe
            refund = stripe.Refund.create(
                payment_intent=order.stripe_payment_intent,
                reason='requested_by_customer'
            )
            
            # Update order status
            order.status = 'refunded'
            order.save()
            
            # Remove games from user's library
            UserGame.objects.filter(
                user=request.user,
                game__in=order.items.values_list('game', flat=True)
            ).delete()
            
            # Create notification
            Notification.objects.create(
                user=request.user,
                title='Order Refunded',
                message=f'Your order {order.order_number} has been refunded successfully. The amount will appear in your account within 5-10 business days.',
                notification_type='warning',
                link=f'/orders/{order.id}'
            )
            
            return Response({
                'message': 'Refund processed successfully',
                'refund_id': refund.id,
                'order_status': order.status
            })
            
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            return Response({'error': f'Stripe error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)