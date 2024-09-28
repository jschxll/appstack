from django.shortcuts import render

from django.shortcuts import render
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .system_info import get_system_info
from django.http import JsonResponse
from django.core.files.storage import FileSystemStorage
from django.views.decorators.http import require_POST
from .models import Application
import socket
import os
from django.template.loader import render_to_string

def get_system_vars():
    dashboard_title = os.getenv("DASHBOARD_TITLE")
    dashboard_header = os.getenv("DASHBOARD_HEADER")
    return {"dashboard_title": dashboard_title, "dashboard_header": dashboard_header}

def index(request):
    system_info = get_system_info()

    # Send a message to the WebSocket group
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "system_info",
        {
            "type": "send_periodic_data",
            "data": system_info
        }
    )

    # Query all added applications from the db
    apps = Application.objects.order_by("id")
    context = {
        "applications": apps,
        "dashboard_env": get_system_vars(),
    }

    return render(request, "index.html", context)

def convert_to_bool(str_val):
    return True if str_val == "true" else False

def get_host_ip():
    try:
        host_ip = socket.gethostbyname("host.docker.internal")
        return host_ip
    except socket.gaierror:
        print(socket.gaierror)

@require_POST
def upload_icon(request):
    if request.FILES["application_icon"]:
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
            ip_address = get_host_ip()

        https = convert_to_bool(request_data.get("https"))
        use_reverse_proxy = convert_to_bool(request_data.get("use_reverse_proxy"))

        # Save new application to db
        app = Application(name=name, ip_address=ip_address, port=port, icon=file_url, https=https, use_reverse_proxy=use_reverse_proxy)
        app.save()
        
        rendered_html = render_to_string("app_card.html", {"app": app})
        return JsonResponse({"html": rendered_html})
    return JsonResponse({"error": "Invalid request. Only POST requests are possible"}, status=400)
