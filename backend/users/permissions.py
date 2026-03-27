from rest_framework import permissions

class IsDeveloper(permissions.BasePermission):
    """
    Permission personnalisée pour n'autoriser que les développeurs.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'developer'
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user == obj.developer or request.user.is_staff

class IsAdminOrReadOnly(permissions.BasePermission):
    """Custom permission to allow read-only access to everyone, but write only to admin."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsGameDeveloper(permissions.BasePermission):
    """Custom permission to allow only the developer of the game to modify it."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user == obj.developer or request.user.is_staff

class CanModerateReview(permissions.BasePermission):
    """Custom permission to allow users to modify their own reviews and admins to moderate."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user == obj.user or request.user.is_staff