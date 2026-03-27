import stripe
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Test Stripe configuration'

    def handle(self, *args, **options):
        self.stdout.write('Testing Stripe configuration...')
        
        # Check if Stripe is configured
        if not settings.STRIPE_SECRET_KEY:
            self.stdout.write(self.style.ERROR('✗ STRIPE_SECRET_KEY not set in settings'))
            return
        
        self.stdout.write(f'Stripe API Version: {stripe.api_version}')
        self.stdout.write(f'Stripe Secret Key: {settings.STRIPE_SECRET_KEY[:10]}...')
        
        try:
            # Test API key by retrieving account info
            account = stripe.Account.retrieve()
            self.stdout.write(self.style.SUCCESS(f'✓ Connected to Stripe account: {account.email}'))
            self.stdout.write(self.style.SUCCESS(f'✓ Account type: {account.type}'))
            self.stdout.write(self.style.SUCCESS(f'✓ Account ID: {account.id}'))
            
            # Test creating a payment intent
            intent = stripe.PaymentIntent.create(
                amount=1000,
                currency='usd',
                metadata={'test': 'true'}
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Successfully created test payment intent: {intent.id}'))
            
            self.stdout.write(self.style.SUCCESS('\n✅ Stripe configuration is working correctly!'))
            
        except stripe.error.AuthenticationError:
            self.stdout.write(self.style.ERROR('✗ Invalid API key. Please check your STRIPE_SECRET_KEY'))
        except stripe.error.APIConnectionError:
            self.stdout.write(self.style.ERROR('✗ Cannot connect to Stripe API. Check your internet connection'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error: {str(e)}'))