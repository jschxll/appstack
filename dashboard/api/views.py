from django.shortcuts import render

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from dashboard.models import Application
from django.core.files.storage import FileSystemStorage
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json
from base.settings import MEDIA_ROOT
from dashboard.views import convert_to_bool

@require_http_methods(["DELETE"])
def delete_application(request):
    try:
        app_name = json.loads(request.body).get("app_name")
        app_to_delete = Application.objects.get(name=app_name)
        """
        TODO: Remove icon from filesystem
        """
        fs = FileSystemStorage()
        fs.delete(MEDIA_ROOT + app_to_delete.icon)
        print(MEDIA_ROOT + app_to_delete.icon)
        app_to_delete.delete()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "update_applications",
            {
                "type": "delete_app",
                "app_name": app_name
            }
        )

        return JsonResponse({'status': 'success', 'message': 'Data updated successfully'})
    except Exception as e:
         return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@require_GET
def get_application(request):
    app_name = request.GET.get("application")
    if app_name:
        try:
            app = Application.objects.get(name=app_name)
            return JsonResponse({
                "app_name": app.name,
                "app_host": f"{app.ip_address}:{app.port}",
                "https": app.https,
                "use_reverse_proxy": app.use_reverse_proxy,
                "icon": app.icon
            })
        except Application.DoesNotExist:
            return JsonResponse({"error": "Application not found."}, status=404)
    return JsonResponse({"error": "Application name not provided."}, status=400)

@require_POST
def edit_application(request):
    file_url = ""
    if "edited_icon" in request.FILES:
        new_icon = request.FILES.get("edited_icon")
        fs = FileSystemStorage()
        file_name = fs.save(new_icon.name, new_icon)
        file_url = fs.url(file_name)

    original_name = request.POST.get("original_name")
    new_name = request.POST.get("edited_application_name")
    new_host = request.POST.get("edited_application_host")
    new_https_conf = convert_to_bool(request.POST.get("edited_https"))
    new_reverse_proxy_conf = convert_to_bool(request.POST.get("edited_use_reverse_proxy"))
    
    ip_addr, port = str(new_host).split(":")

    to_edit_app = Application.objects.get(name=original_name)
    to_edit_app.name = new_name
    to_edit_app.ip_address = ip_addr
    to_edit_app.port = port
    to_edit_app.https = new_https_conf
    to_edit_app.use_reverse_proxy = new_reverse_proxy_conf

    if not file_url == "":
        to_edit_app.icon = file_url

    to_edit_app.save()

    return JsonResponse({"sent_json": "ok"})