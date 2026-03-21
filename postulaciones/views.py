from rest_framework import viewsets
from .models import Postulacion
from .serializers import PostulacionSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsCandidato, IsReclutador



class PostulacionViewSet(viewsets.ModelViewSet):
    queryset = Postulacion.objects.all()
    serializer_class = PostulacionSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsCandidato()]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsReclutador()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(candidato=self.request.user)

    def get_queryset(self):
        user = self.request.user

        # 🔥 Reclutador: ve postulaciones de sus vacantes
        if user.role == 'reclutador':
            return Postulacion.objects.filter(
                vacante__creado_por=user
            )

        # 🔥 Candidato: ve sus postulaciones
        return Postulacion.objects.filter(
            candidato=user
        )