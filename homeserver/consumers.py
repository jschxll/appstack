from channels.generic.websocket import AsyncWebsocketConsumer
import json
import asyncio
from dashboard.system_info import get_system_info
from dashboard.models import Application
from asgiref.sync import sync_to_async
import aiohttp

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

class ApplicationStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(
            "application_status",
            self.channel_name
        )
    
    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            "system_info",
            self.channel_name
        )
    
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        index_page_status = text_data_json["status"]

        if index_page_status == 1:
            await self.send_statuses()
    
    @sync_to_async
    def get_applications(self):
        return list(Application.objects.order_by("id"))

    # return queried apps with their online status
    async def get_applications_with_status(self):
        apps = await self.get_applications()
        statuses = await self.prepare_statuses(apps)
        app_dictionary = {}
        for app in apps:
            app_dictionary[app.name] = statuses[apps.index(app)]
        return app_dictionary

    async def prepare_statuses(self, apps):
        status_tasks = [self.fetch_status(app) for app in apps]
        statuses = await asyncio.gather(*status_tasks)
        return statuses

    async def fetch_status(self, app):
        url = f"https://{app.ip_address}:{app.port}" if app.https else f"http://{app.ip_address}:{app.port}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=2) as resp:
                    return resp.status == 200
        except:
            return False
    
    async def send_statuses(self):
        apps_with_status = await self.get_applications_with_status()
        await self.send(text_data=json.dumps(apps_with_status))