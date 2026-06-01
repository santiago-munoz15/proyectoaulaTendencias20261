from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count

from .models import Entrevista, Postulacion, Contrato
from .permissions import IsCandidato, IsReclutador
from .serializers import EntrevistaSerializer, PostulacionSerializer, ContratoSerializer


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

    @action(detail=False, methods=['get'], url_path='reportes/embudo')
    def embudo(self, request):
        # Solo reclutadores pueden ver reportes de sus vacantes
        user = request.user
        if not user.is_authenticated or user.role != 'reclutador':
            return Response({'detail': 'Permisos insuficientes.'}, status=403)

        qs = Postulacion.objects.filter(vacante__creado_por=user)

        # Total de postulaciones por vacante
        vacantes_agg = qs.values('vacante_id', 'vacante__titulo').annotate(total_postulaciones=Count('id'))

        # Candidatos por etapa (estado)
        etapas_agg = qs.values('estado').annotate(cantidad=Count('id'))

        total_global = qs.count()
        aprobadas_global = qs.filter(estado='aprobado').count()
        tasa_conversion_global = (aprobadas_global / total_global * 100) if total_global else 0

        vacantes_list = []
        for v in vacantes_agg:
            vid = v['vacante_id']
            total_v = v['total_postulaciones']
            aprob_v = qs.filter(vacante_id=vid, estado='aprobado').count()
            tasa_v = (aprob_v / total_v * 100) if total_v else 0
            vacantes_list.append({
                'vacante_id': vid,
                'vacante_titulo': v['vacante__titulo'],
                'total_postulaciones': total_v,
                'aprobadas': aprob_v,
                'tasa_conversion': round(tasa_v, 2),
            })

        return Response({
            'total_postulaciones_por_vacante': vacantes_list,
            'candidatos_por_etapa': list(etapas_agg),
            'tasa_conversion_global': round(tasa_conversion_global, 2),
            'total_postulaciones_global': total_global,
        })


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


class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.select_related('postulacion', 'postulacion__vacante', 'postulacion__candidato', 'vacante')
    serializer_class = ContratoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsReclutador()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'reclutador':
            return self.queryset.filter(vacante__creado_por=user)
        return self.queryset.filter(postulacion__candidato=user)