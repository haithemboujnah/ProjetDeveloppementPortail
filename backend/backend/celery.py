import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-daily-digest': {
        'task': 'users.tasks.send_daily_digest',
        'schedule': crontab(hour=9, minute=0),
    },
    'clean-expired-sessions': {
        'task': 'users.tasks.clean_expired_sessions',
        'schedule': crontab(hour=0, minute=0),
    },
    'update-game-featured-status': {
        'task': 'games.tasks.update_featured_status',
        'schedule': crontab(hour=0, minute=0),
    },
    'process-pending-payouts': {
        'task': 'orders.tasks.process_pending_payouts',
        'schedule': crontab(day_of_week='monday', hour=0, minute=0),
    },
}