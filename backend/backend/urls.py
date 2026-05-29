from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from users.views import proxy_image

# Swagger configuration
schema_view = get_schema_view(
    openapi.Info(
        title="Steam Clone API",
        default_version='v1',
        description="API documentation for Steam Clone Platform",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="support@steamclone.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

def api_root(request):
    return JsonResponse({
        'message': 'Welcome to Steam Clone API',
        'version': '1.0',
        'documentation': '/swagger/',
        'endpoints': {
            'admin': '/admin/',
            'proxy': '/proxy-image/',
            'api_token': '/api/token/',
            'api_token_refresh': '/api/token/refresh/',
            'users': '/api/users/',
            'games': '/api/games/',
            'reviews': '/api/reviews/',
            'orders': '/api/orders/',
            'notifications': '/api/notifications/',
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    
    # Swagger
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    path('proxy-image/', proxy_image, name='proxy-image'),

    # Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints
    path('api/users/', include('users.urls')),
    path('api/games/', include('games.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/ai/', include('ai.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)