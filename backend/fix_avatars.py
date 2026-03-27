import os
import django
import urllib.parse

# Configurer Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def fix_avatar_urls():
    users = User.objects.all()
    fixed_count = 0
    
    print('Fixing avatar URLs...')
    
    for user in users:
        if user.avatar and ('/media/https%3A' in user.avatar or '/media/http%3A' in user.avatar):
            # Extraire l'URL réelle
            encoded_url = user.avatar.replace('/media/', '')
            decoded_url = urllib.parse.unquote(encoded_url)
            
            # S'assurer que c'est une URL complète
            if not decoded_url.startswith('http'):
                decoded_url = 'https://' + decoded_url
            
            user.avatar = decoded_url
            user.save()
            fixed_count += 1
            print(f'✓ Fixed avatar for {user.username}: {decoded_url[:80]}...')
        elif user.avatar:
            print(f'ℹ Avatar for {user.username}: {user.avatar[:80]}...')
    
    if fixed_count == 0:
        print('No avatar URLs needed fixing')
    else:
        print(f'\n✅ Fixed {fixed_count} avatar URLs')

if __name__ == '__main__':
    fix_avatar_urls()