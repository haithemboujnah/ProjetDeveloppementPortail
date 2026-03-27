import time
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

class RateLimitMiddleware:
    """Simple rate limiting middleware"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Désactiver en mode développement
        if settings.DEBUG:
            return self.get_response(request)
        
        # Skip pour admin et API docs
        if request.path.startswith('/admin/') or request.path.startswith('/swagger/'):
            return self.get_response(request)
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Rate limit key
        key = f'rate_limit_{ip}'
        
        # Get request count
        requests = cache.get(key, 0)
        
        # Limit: 100 requests per minute
        if requests > 100:
            return JsonResponse(
                {'error': 'Rate limit exceeded. Please try again later.'},
                status=429
            )
        
        # Increment counter
        cache.set(key, requests + 1, 60)
        
        response = self.get_response(request)
        return response