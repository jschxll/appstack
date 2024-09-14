from django.shortcuts import render

from django.shortcuts import render
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .system_info import get_system_info
from django.http import JsonResponse
from django.core.files.storage import FileSystemStorage
from .models import Application
import socket

def index(request):
    system_info = get_system_info()

    # Send a message to the WebSocket group
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "system_info",
        {
            "type": "send_message",
            "data": system_info
        }
    )

    # query all added applications from the db
    applications = Application.objects.order_by("id")
    context = {
        "applications": applications,
    }

    return render(request, "index.html", context)

def upload_icon(request):
    if request.method == "POST" and request.FILES["application_icon"]:
        request_data = request.POST
        name = request_data.get("application_name")
        host = request_data.get("application_host")

        # store icon in filesystem
        uploaded_file = request.FILES["application_icon"]
        fs = FileSystemStorage()
        file_name = fs.save(uploaded_file.name, uploaded_file)
        file_url = fs.url(file_name)

        # divide port from ip address
        ip_address, port = str(host).split(":")

        if ip_address == "localhost" or ip_address == "127.0.0.1":
            ip_address = socket.gethostbyname(socket.gethostname())

        # Save new application to db
        app = Application(name=name, ip_address=ip_address, port=port, icon=file_url)
        app.save()

        return JsonResponse({"file_url": file_url})
    return JsonResponse({"error": "Invalid request. Only POST requests are possible"}, status=400)