from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from vacantes.views import VacanteViewSet
from postulaciones.views import PostulacionViewSet

router = DefaultRouter()
router.register(r'vacantes', VacanteViewSet)
router.register(r'postulaciones', PostulacionViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include(router.urls)), 
]