from django.urls import path
from . import views

urlpatterns = [
    path("delete_application", views.delete_application),
    path("get_applications", views.get_applications)
]