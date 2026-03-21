from django.db import models


class Candidato(models.Model):
	nombre = models.CharField(max_length=120)
	correo = models.EmailField(unique=True)
	telefono = models.CharField(max_length=30)
	perfil_profesional = models.TextField()
	hoja_vida = models.TextField(help_text='URL o texto de hoja de vida')
	creado_en = models.DateTimeField(auto_now_add=True)
	actualizado_en = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-creado_en']

	def __str__(self):
		return f"{self.nombre} ({self.correo})"
