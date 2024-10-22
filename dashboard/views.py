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

def is_valid_ip(ip_addr):
    if ip_addr == "":
        return False
    
    if not ":" in ip_addr:
        return False
    
    parts, port = ip_addr.split(":")

    if not parts == "localhost":
        port = int(port)
        if port <= 0:
            return False
        parts = parts.split(".")

        if (len(parts) != 4):
            return False
    
        for part in parts:
            if not part.isdigit():
                return False
    
            num = int(part)
            if num <= 0 or num >= 255:
                return False
    
            if part != str(part):
                return False
    return True


def get_host_ip():
    try:
        host_ip = socket.gethostbyname("host.docker.internal")
        return host_ip
    except socket.gaierror:
        print(socket.gaierror)

def validate_app(new_app):
    status_msg = {"status": "success", "affected_properties": []}

    # exclude the current application to prevent overlapping values
    if Application.objects.filter(name=new_app.name).exclude(id=new_app.id).exists():
        status_msg["status"] = "ApplicationAlreadyExists"
        status_msg["affected_properties"].append("app.name")

    if Application.objects.filter(port=new_app.port, ip_address=new_app.ip_address).exclude(id=new_app.id).exists():
        status_msg["status"] = "ApplicationAlreadyExists"
        status_msg["affected_properties"].append("app.host")

    if status_msg["affected_properties"]:
        status_msg["status"] = "ApplicationAlreadyExists"

    return status_msg

def validate_required_fields(received_request):
    status = ""
    affected_properties = []
    if received_request.get("application_name") == "":
        status = "EmptyField"
        affected_properties.append("app.name")
    if received_request.get("application_host") == "":
        if not "EmptyField" in status:
            status = "EmptyField"
        affected_properties.append("app.host")
    
    if status and affected_properties:
        return {"status": status, "affected_properties": affected_properties}

def save_app(new_app, icon):
    status_msg = validate_app(new_app)
    if status_msg["affected_properties"]:
        return JsonResponse(status_msg)
    fs = FileSystemStorage()
    file_name = fs.save(icon.name, icon)
    file_url = fs.url(file_name)
    new_app.icon = file_url

    new_app.save()
    status_msg["html"] = send_app_props(new_app)
    return JsonResponse(status_msg)

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
    request_data = request.POST

    error_resp = validate_required_fields(request_data)
    if error_resp is not None:
        return JsonResponse(error_resp)
    name = request_data.get("application_name")
    host = request_data.get("application_host")

    # store icon in filesystem
    uploaded_file = request.FILES["application_icon"]

    if not is_valid_ip(host):
        return JsonResponse({"status": "InvalidIPv4AddressError", "cause": "Given string is not a valid IP-Address", "affected_properties": ["app.host"]})

    # divide port from ip address
    ip_address, port = str(host).split(":")

    if ip_address == "localhost" or ip_address == "127.0.0.1":
        ip_address = get_host_ip()

    https = convert_to_bool(request_data.get("https"))
    use_reverse_proxy = convert_to_bool(request_data.get("use_reverse_proxy"))
    app = Application(name=name, ip_address=ip_address, port=port, icon=None, https=https, use_reverse_proxy=use_reverse_proxy)

    # Save new application to db, if it's not already exists
    return save_app(app, uploaded_file)