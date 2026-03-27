from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.db.models import Sum
from .models import Order, OrderItem
from games.models import Game
from django.contrib.auth import get_user_model
from datetime import timedelta
from django.utils import timezone

User = get_user_model()

@shared_task
def send_order_confirmation_email(order_id):
    try:
        order = Order.objects.get(id=order_id)
        subject = f'Order Confirmation - {order.order_number}'
        message = render_to_string('emails/order_confirmation.html', {
            'order': order,
            'user': order.user,
            'site_name': 'Steam Clone'
        })
        send_mail(
            subject,
            '',
            'noreply@steamclone.com',
            [order.user.email],
            html_message=message,
            fail_silently=False,
        )
        return f"Order confirmation sent for {order.order_number}"
    except Order.DoesNotExist:
        return f"Order {order_id} not found"

@shared_task
def process_pending_payouts():
    """Process developer payouts"""
    # Calculate payouts for the last month
    month_ago = timezone.now() - timedelta(days=30)
    developers = User.objects.filter(role='developer')
    
    results = []
    for developer in developers:
        # Calculate total sales for developer's games
        total_sales = OrderItem.objects.filter(
            game__developer=developer,
            order__status='completed',
            order__created_at__gte=month_ago
        ).aggregate(total=Sum('price_paid'))['total'] or 0
        
        # 70% goes to developer
        payout_amount = total_sales * 0.7
        
        if payout_amount > 0:
            # In production, this would trigger actual payment
            # For now, just log
            results.append({
                'developer': developer.username,
                'total_sales': float(total_sales),
                'payout': float(payout_amount)
            })
            
            # Send email notification
            subject = 'Monthly Payout Ready'
            message = render_to_string('emails/payout_notification.html', {
                'developer': developer,
                'payout_amount': payout_amount,
                'total_sales': total_sales,
                'site_name': 'Steam Clone'
            })
            send_mail(
                subject,
                '',
                'noreply@steamclone.com',
                [developer.email],
                html_message=message,
                fail_silently=True,
            )
    
    return results

@shared_task
def release_game_license(order_item_id):
    """Release game license to user"""
    try:
        order_item = OrderItem.objects.get(id=order_item_id)
        game = order_item.game
        user = order_item.order.user
        
        # Generate license key (simple implementation)
        import uuid
        license_key = str(uuid.uuid4())
        
        # Store license in a separate model (you'd need to create this)
        # GameLicense.objects.create(user=user, game=game, license_key=license_key)
        
        return f"License {license_key} generated for {user.username} - {game.title}"
    except OrderItem.DoesNotExist:
        return f"Order item {order_item_id} not found"