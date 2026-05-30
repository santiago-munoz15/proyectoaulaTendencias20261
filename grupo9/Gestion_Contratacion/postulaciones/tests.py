from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from postulaciones.models import Postulacion
from vacantes.models import Vacante


User = get_user_model()


class PostulacionesApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.reclutador = User.objects.create_user(
			username='reclutador',
			password='Secreto123',
			role='reclutador',
		)
		self.candidato = User.objects.create_user(
			username='candidato',
			password='Secreto123',
			role='candidato',
		)
		self.otro_candidato = User.objects.create_user(
			username='candidato2',
			password='Secreto123',
			role='candidato',
		)
		self.vacante = Vacante.objects.create(
			titulo='Backend Django',
			descripcion='Desarrollador backend',
			area='TI',
			fecha_limite=timezone.localdate() + timedelta(days=10),
			estado='activa',
			creado_por=self.reclutador,
		)

	def auth_as(self, user):
		self.client.force_authenticate(user=user)

	def test_candidate_can_create_and_see_own_postulations(self):
		self.auth_as(self.candidato)
		response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data['estado'], 'en_revision')

		self.auth_as(self.otro_candidato)
		list_response = self.client.get('/api/postulaciones/')

		self.assertEqual(list_response.status_code, 200)
		self.assertEqual(len(list_response.data['results']), 0)

	def test_reclutador_cannot_skip_flow(self):
		self.auth_as(self.candidato)
		create_response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')
		postulacion_id = create_response.data['id']

		self.auth_as(self.reclutador)
		invalid = self.client.patch(f'/api/postulaciones/{postulacion_id}/', {'estado': 'aprobado'}, format='json')

		self.assertEqual(invalid.status_code, 400)
		self.assertIn('Transición de estado inválida', str(invalid.data))

		valid_review = self.client.patch(f'/api/postulaciones/{postulacion_id}/', {'estado': 'entrevistado'}, format='json')
		self.assertEqual(valid_review.status_code, 200)
		self.assertEqual(valid_review.data['estado'], 'entrevistado')

		valid_approval = self.client.patch(f'/api/postulaciones/{postulacion_id}/', {'estado': 'aprobado'}, format='json')
		self.assertEqual(valid_approval.status_code, 200)
		self.assertEqual(valid_approval.data['estado'], 'aprobado')

	def test_candidate_cannot_access_other_candidates_postulation(self):
		other_postulation = self._create_postulation(self.otro_candidato)

		self.auth_as(self.candidato)
		detail = self.client.get(f'/api/postulaciones/{other_postulation.id}/')

		self.assertEqual(detail.status_code, 404)

	def test_reclutador_can_register_interview(self):
		postulacion = self._create_postulation(self.candidato)

		self.auth_as(self.reclutador)
		response = self.client.post('/api/entrevistas/', {
			'postulacion': postulacion.id,
			'fecha': (timezone.now() + timedelta(days=1)).isoformat(),
			'modalidad': 'virtual',
			'observaciones': 'Buena experiencia',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		postulacion.refresh_from_db()
		self.assertEqual(postulacion.estado, 'entrevistado')

		self.auth_as(self.candidato)
		detail = self.client.get(f'/api/postulaciones/{postulacion.id}/')
		self.assertEqual(detail.status_code, 200)
		self.assertEqual(len(detail.data['entrevistas']), 1)

	def test_candidate_cannot_update_or_delete_own_postulation(self):
		postulacion = self._create_postulation(self.candidato)

		self.auth_as(self.candidato)
		patch_response = self.client.patch(
			f'/api/postulaciones/{postulacion.id}/',
			{'estado': 'aprobado'},
			format='json'
		)
		delete_response = self.client.delete(f'/api/postulaciones/{postulacion.id}/')

		self.assertEqual(patch_response.status_code, 403)
		self.assertEqual(delete_response.status_code, 403)

	def _create_postulation(self, candidato):
		self.auth_as(candidato)
		response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')
		self.assertEqual(response.status_code, 201)
		return Postulacion.objects.get(id=response.data['id'])
