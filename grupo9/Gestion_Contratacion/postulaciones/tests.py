from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from postulaciones.models import Postulacion
from vacantes.models import Vacante


User = get_user_model()


class PostulacionesApiTests(TestCase):
	def approval_payload(self):
		return {
			'estado': 'aprobado',
			'contrato_fecha_inicio': (timezone.localdate() + timedelta(days=3)).isoformat(),
			'contrato_tipo_contrato': 'indefinido',
			'contrato_salario': '4500000',
		}

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
		invalid = self.client.patch(f'/api/postulaciones/{postulacion_id}/', self.approval_payload(), format='json')

		self.assertEqual(invalid.status_code, 400)
		self.assertIn('Transición de estado inválida', str(invalid.data))

		valid_review = self.client.patch(f'/api/postulaciones/{postulacion_id}/', {'estado': 'entrevistado'}, format='json')
		self.assertEqual(valid_review.status_code, 200)
		self.assertEqual(valid_review.data['estado'], 'entrevistado')

		valid_approval = self.client.patch(f'/api/postulaciones/{postulacion_id}/', self.approval_payload(), format='json')
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

	def test_contract_preserves_selection_snapshot_after_vacancy_changes(self):
		postulacion = self._create_postulation(self.candidato)

		self.auth_as(self.reclutador)
		self.client.patch(
			f'/api/postulaciones/{postulacion.id}/',
			{'estado': 'entrevistado'},
			format='json'
		)
		approval = self.client.patch(
			f'/api/postulaciones/{postulacion.id}/',
			self.approval_payload(),
			format='json'
		)

		self.assertEqual(approval.status_code, 200)
		postulacion.refresh_from_db()

		contrato = postulacion.contrato
		self.assertEqual(contrato.cargo, 'Backend Django')
		self.assertEqual(contrato.area, 'TI')
		self.assertEqual(contrato.candidato_nombre, self.candidato.username)
		self.assertEqual(contrato.estado_postulacion, 'aprobado')

		self.vacante.titulo = 'Backend Senior'
		self.vacante.area = 'Arquitectura'
		self.vacante.save()

		contrato.refresh_from_db()
		self.assertEqual(contrato.cargo, 'Backend Django')
		self.assertEqual(contrato.area, 'TI')
		self.assertEqual(contrato.vacante.titulo, 'Backend Senior')

	def test_closed_vacancy_blocks_new_postulations_and_keeps_history(self):
		existing_postulation = self._create_postulation(self.candidato)

		self.vacante.estado = 'cerrada'
		self.vacante.save(update_fields=['estado'])

		self.auth_as(self.otro_candidato)
		response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertIn('cerrada', str(response.data).lower())
		self.assertTrue(Postulacion.objects.filter(id=existing_postulation.id).exists())

	def test_expired_vacancy_blocks_new_postulations_and_keeps_history(self):
		existing_postulation = self._create_postulation(self.candidato)

		self.vacante.fecha_limite = timezone.localdate() - timedelta(days=1)
		self.vacante.save(update_fields=['fecha_limite'])

		self.auth_as(self.otro_candidato)
		response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertIn('vencida', str(response.data).lower())
		self.assertTrue(Postulacion.objects.filter(id=existing_postulation.id).exists())

	def test_funnel_reports_match_real_postulation_state(self):
		vacante_secundaria = Vacante.objects.create(
			titulo='Frontend React',
			descripcion='Desarrollador frontend',
			area='TI',
			fecha_limite=timezone.localdate() + timedelta(days=12),
			estado='activa',
			creado_por=self.reclutador,
		)

		self.auth_as(self.candidato)
		p1 = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')
		p2 = self.client.post('/api/postulaciones/', {'vacante': vacante_secundaria.id}, format='json')

		self.assertEqual(p1.status_code, 201)
		self.assertEqual(p2.status_code, 201)

		self.auth_as(self.reclutador)
		self.client.patch(f"/api/postulaciones/{p1.data['id']}/", {'estado': 'entrevistado'}, format='json')
		self.client.patch(f"/api/postulaciones/{p2.data['id']}/", {'estado': 'entrevistado'}, format='json')
		self.client.patch(f"/api/postulaciones/{p2.data['id']}/", self.approval_payload(), format='json')

		reporte = self.client.get('/api/postulaciones/reportes/embudo/')

		self.assertEqual(reporte.status_code, 200)

		data = reporte.data
		qs = Postulacion.objects.filter(vacante__creado_por=self.reclutador)

		self.assertEqual(data['total_postulaciones_global'], qs.count())
		self.assertEqual(data['tasa_conversion_global'], round(qs.filter(estado='aprobado').count() / qs.count() * 100, 2))

		por_estado = {item['estado']: item['cantidad'] for item in data['candidatos_por_etapa']}
		self.assertEqual(por_estado.get('en_revision', 0), qs.filter(estado='en_revision').count())
		self.assertEqual(por_estado.get('entrevistado', 0), qs.filter(estado='entrevistado').count())
		self.assertEqual(por_estado.get('aprobado', 0), qs.filter(estado='aprobado').count())
		self.assertEqual(por_estado.get('rechazado', 0), qs.filter(estado='rechazado').count())

		por_vacante = {item['vacante_id']: item for item in data['total_postulaciones_por_vacante']}
		self.assertEqual(por_vacante[self.vacante.id]['total_postulaciones'], qs.filter(vacante=self.vacante).count())
		self.assertEqual(por_vacante[vacante_secundaria.id]['total_postulaciones'], qs.filter(vacante=vacante_secundaria).count())
		self.assertEqual(por_vacante[vacante_secundaria.id]['aprobadas'], qs.filter(vacante=vacante_secundaria, estado='aprobado').count())

	def test_full_api_flow_creates_contract_from_publication_to_hiring(self):
		self.auth_as(self.reclutador)
		vacante_response = self.client.post('/api/vacantes/', {
			'titulo': 'QA Automation',
			'descripcion': 'Pruebas automatizadas',
			'area': 'Calidad',
			'fecha_limite': (timezone.localdate() + timedelta(days=15)).isoformat(),
			'estado': 'activa',
		}, format='json')
		self.assertEqual(vacante_response.status_code, 201)

		vacante_id = vacante_response.data['id']

		self.auth_as(self.candidato)
		postulacion_response = self.client.post('/api/postulaciones/', {'vacante': vacante_id}, format='json')
		self.assertEqual(postulacion_response.status_code, 201)

		postulacion_id = postulacion_response.data['id']

		self.auth_as(self.reclutador)
		entrevista_response = self.client.post('/api/entrevistas/', {
			'postulacion': postulacion_id,
			'fecha': (timezone.now() + timedelta(days=1)).isoformat(),
			'modalidad': 'virtual',
			'observaciones': 'Encaja con el perfil',
		}, format='json')
		self.assertEqual(entrevista_response.status_code, 201)

		approval_response = self.client.patch(
			f'/api/postulaciones/{postulacion_id}/',
			self.approval_payload(),
			format='json'
		)
		self.assertEqual(approval_response.status_code, 200)
		self.assertEqual(approval_response.data['estado'], 'aprobado')
		self.assertIsNotNone(approval_response.data['contrato'])

		contrato_id = approval_response.data['contrato']['id']
		contrato_response = self.client.get(f'/api/contratos/{contrato_id}/')
		self.assertEqual(contrato_response.status_code, 200)
		self.assertEqual(contrato_response.data['candidato'], self.candidato.username)
		self.assertEqual(contrato_response.data['cargo'], 'QA Automation')

		vacantes_response = self.client.get('/api/vacantes/')
		self.assertEqual(vacantes_response.status_code, 200)
		vacante_estado = next(item for item in vacantes_response.data['results'] if item['id'] == vacante_id)
		self.assertEqual(vacante_estado['estado'], 'cerrada')

	def _create_postulation(self, candidato):
		self.auth_as(candidato)
		response = self.client.post('/api/postulaciones/', {'vacante': self.vacante.id}, format='json')
		self.assertEqual(response.status_code, 201)
		return Postulacion.objects.get(id=response.data['id'])
