from channels.generic.websocket import AsyncWebsocketConsumer
import json
import asyncio
from dashboard.system_info import get_system_info
from dashboard.models import Application

class SystemInfoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

        # loop variable to send realtime data
        self.keep_sending = True
        await self.channel_layer.group_add(
            "system_info",
            self.channel_name
        )
        
        # create new task to send new system info
        asyncio.create_task(self.send_periodic_data())

    async def disconnect(self, code):
        # stop system-info loop
        self.keep_sending = False
        await self.channel_layer.group_discard(
            "system_info",
            self.channel_name
        )

    async def send_periodic_data(self):
        # as long as keep_sening = true, new system info will be send every second to the client
        while self.keep_sending:
            system_info = get_system_info()
            await self.send(text_data=json.dumps(system_info))
            await asyncio.sleep(1)

class ApplicationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

        await self.channel_layer.group_add(
            "applications",
            self.channel_name
        )

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            "applications",
            self.channel_name
        )
    
    async def send_applications(self):
        apps = Application.objects.order_by("id")
        await self.send(text_data=json.dumps(apps))