from rest_framework.routers import DefaultRouter
from .views import VacanteViewSet

router = DefaultRouter()
router.register(r'vacantes', VacanteViewSet)

urlpatterns = router.urls