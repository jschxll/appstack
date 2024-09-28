from django.shortcuts import render

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_GET
from dashboard.models import Application
from django.core.files.storage import FileSystemStorage
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json
from homeserver.settings import MEDIA_ROOT

@require_http_methods(["PUT"])
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
def get_applications(request):
    return JsonResponse({"status": "success"})