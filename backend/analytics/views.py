from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta

from sympy import Q
from games.models import Game
from orders.models import Order, OrderItem
from users.models import User

class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        # Get date range
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Platform stats
        total_users = User.objects.count()
        total_developers = User.objects.filter(role='developer').count()
        total_games = Game.objects.filter(is_published=True).count()
        total_orders = Order.objects.filter(created_at__gte=start_date, status='completed').count()
        
        # Revenue stats
        total_revenue = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__status='completed'
        ).aggregate(total=Sum('price_paid'))['total'] or 0
        
        platform_commission = total_revenue * 0.30  # 30% platform fee
        developer_payouts = total_revenue * 0.70
        
        # Top games
        top_games = Game.objects.annotate(
            sales_count=Count('orderitem', filter=Q(orderitem__order__status='completed'))
        ).order_by('-sales_count')[:10]
        
        # Daily stats
        daily_stats = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            daily_orders = Order.objects.filter(
                created_at__date=date,
                status='completed'
            ).count()
            daily_revenue = OrderItem.objects.filter(
                order__created_at__date=date,
                order__status='completed'
            ).aggregate(total=Sum('price_paid'))['total'] or 0
            
            daily_stats.append({
                'date': date.date(),
                'orders': daily_orders,
                'revenue': float(daily_revenue)
            })
        
        return Response({
            'overview': {
                'total_users': total_users,
                'total_developers': total_developers,
                'total_games': total_games,
                'total_orders': total_orders,
            },
            'revenue': {
                'total_revenue': float(total_revenue),
                'platform_commission': float(platform_commission),
                'developer_payouts': float(developer_payouts),
            },
            'top_games': [
                {
                    'id': game.id,
                    'title': game.title,
                    'sales': game.sales_count,
                    'revenue': float(game.orderitem_set.filter(order__status='completed').aggregate(total=Sum('price_paid'))['total'] or 0)
                }
                for game in top_games
            ],
            'daily_stats': daily_stats
        })