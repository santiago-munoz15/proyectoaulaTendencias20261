from rest_framework import viewsets
from .models import Vacante
from .serializers import VacanteSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsReclutador
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class VacanteViewSet(viewsets.ModelViewSet):
    queryset = Vacante.objects.all()
    serializer_class = VacanteSerializer

    #FILTROS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['estado', 'area']
    search_fields = ['titulo', 'descripcion']

    #PERMISOS
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsReclutador()]
        return [IsAuthenticated()]

    # GUARDAR USUARIO
    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)