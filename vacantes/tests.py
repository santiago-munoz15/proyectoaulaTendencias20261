from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient


User = get_user_model()


class VacantesApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.reclutador = User.objects.create_user(username='reclutador', password='Secreto123', role='reclutador')
		self.candidato = User.objects.create_user(username='candidato', password='Secreto123', role='candidato')

	def test_reclutador_puede_crear_vacante(self):
		self.client.force_authenticate(user=self.reclutador)
		response = self.client.post('/api/vacantes/', {
			'titulo': 'QA Engineer',
			'descripcion': 'Pruebas automatizadas',
			'area': 'TI',
			'fecha_limite': timezone.localdate() + timedelta(days=7),
			'estado': 'activa',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data['creado_por'], 'reclutador')

	def test_candidato_no_puede_crear_vacante(self):
		self.client.force_authenticate(user=self.candidato)
		response = self.client.post('/api/vacantes/', {
			'titulo': 'QA Engineer',
			'descripcion': 'Pruebas automatizadas',
			'area': 'TI',
			'fecha_limite': timezone.localdate() + timedelta(days=7),
			'estado': 'activa',
		}, format='json')

		self.assertEqual(response.status_code, 403)
