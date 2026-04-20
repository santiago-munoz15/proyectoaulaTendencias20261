from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Entrevista, Postulacion
from .permissions import IsCandidato, IsReclutador
from .serializers import EntrevistaSerializer, PostulacionSerializer


class PostulacionViewSet(viewsets.ModelViewSet):
    queryset = Postulacion.objects.select_related(
        'candidato',
        'vacante',
        'vacante__creado_por',
    ).prefetch_related('entrevistas', 'entrevistas__entrevistador')
    serializer_class = PostulacionSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsCandidato()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsReclutador()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(candidato=self.request.user, estado='en_revision')

    def get_queryset(self):
        user = self.request.user

        # Reclutador ve postulaciones de sus vacantes
        if user.role == 'reclutador':
            return Postulacion.objects.filter(
                vacante__creado_por=user
            )

        #Candidato  ve sus postulaciones
        return Postulacion.objects.filter(
            candidato=user
        )


class EntrevistaViewSet(viewsets.ModelViewSet):
    queryset = Entrevista.objects.select_related(
        'postulacion',
        'postulacion__vacante',
        'postulacion__candidato',
        'entrevistador',
    )
    serializer_class = EntrevistaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsReclutador()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'reclutador':
            return self.queryset.filter(postulacion__vacante__creado_por=user)

        return self.queryset.filter(postulacion__candidato=user)