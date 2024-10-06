from django.urls import path
from . import views

urlpatterns = [
    path("delete_application", views.delete_application),
    path("edit_application", views.edit_application),
    path("get_application", views.get_application)
]