from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import re

def validate_username(value):
    """Validate username format"""
    if len(value) < 3:
        raise ValidationError(
            _('Username must be at least 3 characters long.'),
            code='username_too_short'
        )
    if len(value) > 30:
        raise ValidationError(
            _('Username must be at most 30 characters long.'),
            code='username_too_long'
        )
    if not re.match(r'^[\w.@+-]+$', value):
        raise ValidationError(
            _('Username can only contain letters, numbers, and @/./+/-/_ characters.'),
            code='username_invalid'
        )

def validate_password_strength(value):
    """Validate password strength"""
    if len(value) < 8:
        raise ValidationError(
            _('Password must be at least 8 characters long.'),
            code='password_too_short'
        )
    if not re.search(r'[A-Z]', value):
        raise ValidationError(
            _('Password must contain at least one uppercase letter.'),
            code='password_no_upper'
        )
    if not re.search(r'[0-9]', value):
        raise ValidationError(
            _('Password must contain at least one number.'),
            code='password_no_number'
        )
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise ValidationError(
            _('Password must contain at least one special character.'),
            code='password_no_special'
        )