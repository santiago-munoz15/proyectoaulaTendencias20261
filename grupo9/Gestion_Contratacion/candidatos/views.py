from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Candidato
from .serializers import CandidatoSerializer


class CandidatoViewSet(viewsets.ModelViewSet):
	queryset = Candidato.objects.all()
	serializer_class = CandidatoSerializer
	permission_classes = [IsAuthenticated]
