from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


User = get_user_model()


class AccountsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			username='reclutador1',
			password='Secreto123',
			email='reclutador@example.com',
			role='reclutador',
		)

	def test_login_and_me(self):
		response = self.client.post('/api/auth/login/', {
			'username': 'reclutador1',
			'password': 'Secreto123',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertIn('access', response.data)

		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
		me = self.client.get('/api/auth/me/')

		self.assertEqual(me.status_code, 200)
		self.assertEqual(me.data['username'], 'reclutador1')
		self.assertEqual(me.data['role'], 'reclutador')
