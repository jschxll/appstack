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

def save_app(new_app, icon):
    already_exist_msg = {"status": "success", "affected_properties": []}

    if Application.objects.filter(name=new_app.name).exists():
        already_exist_msg["affected_properties"].append("app.name")
    if Application.objects.filter(port=new_app.port).exists():
        already_exist_msg["affected_properties"].append("app.port")

    if already_exist_msg["affected_properties"]:
        print(already_exist_msg)
        already_exist_msg["status"] = "already exist"
        return JsonResponse(already_exist_msg)

    fs = FileSystemStorage()
    file_name = fs.save(icon.name, icon)
    file_url = fs.url(file_name)
    new_app.icon = file_url

    new_app.save()
    already_exist_msg["html"] = send_app_props(new_app)
    return JsonResponse(already_exist_msg)

def send_app_props(app):
    apps_in_db = len(Application.objects.values())
    rendered_html = render_to_string("app_card.html", {"app": app, "loop_index": apps_in_db})
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "application_status", 
        {
            "type": "send_statuses",
        }
    )
    return rendered_html

@require_POST
def upload_icon(request):
    if request.FILES["application_icon"]:
        request_data = request.POST
        name = request_data.get("application_name")
        host = request_data.get("application_host")

        # store icon in filesystem
        uploaded_file = request.FILES["application_icon"]

        # divide port from ip address
        ip_address, port = str(host).split(":")

        if ip_address == "localhost" or ip_address == "127.0.0.1":
            ip_address = get_host_ip()

        https = convert_to_bool(request_data.get("https"))
        use_reverse_proxy = convert_to_bool(request_data.get("use_reverse_proxy"))
        app = Application(name=name, ip_address=ip_address, port=port, icon=None, https=https, use_reverse_proxy=use_reverse_proxy)

        # Save new application to db, if it's not already exists
        return save_app(app, uploaded_file)
