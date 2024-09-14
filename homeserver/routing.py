from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from . import consumers

websocket_urlpatterns = [
    path("ws/system-info/", consumers.SystemInfoConsumer.as_asgi())
]