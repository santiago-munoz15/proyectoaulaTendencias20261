from django.conf import settings
from django.db import models

from vacantes.models import Vacante


class Postulacion(models.Model):

    ESTADOS = (
        ('en_revision', 'En revisión'),
        ('entrevistado', 'Entrevistado'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    )

    TRANSICIONES_PERMITIDAS = {
        'en_revision': {'entrevistado', 'rechazado'},
        'entrevistado': {'aprobado', 'rechazado'},
        'aprobado': set(),
        'rechazado': set(),
    }

    candidato = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='postulaciones'
    )

    vacante = models.ForeignKey(
        Vacante,
        on_delete=models.CASCADE,
        related_name='postulaciones'
    )

    fecha_postulacion = models.DateTimeField(auto_now_add=True)

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='en_revision'
    )

    class Meta:
        unique_together = ('candidato', 'vacante')  # evita duplicados
        ordering = ['-fecha_postulacion']

    def __str__(self):
        return f"{self.candidato} - {self.vacante}"

    @property
    def es_activa(self):
        return self.estado in {'en_revision', 'entrevistado'}

    def puede_transicionar_a(self, nuevo_estado):
        return nuevo_estado in self.TRANSICIONES_PERMITIDAS.get(self.estado, set())


class Entrevista(models.Model):
    MODALIDADES = (
        ('virtual', 'Virtual'),
        ('presencial', 'Presencial'),
        ('telefonica', 'Telefónica'),
    )

    postulacion = models.ForeignKey(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='entrevistas'
    )
    fecha = models.DateTimeField()
    modalidad = models.CharField(max_length=20, choices=MODALIDADES)
    entrevistador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='entrevistas_realizadas'
    )
    observaciones = models.TextField(blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-creada_en']

    def __str__(self):
        return f"Entrevista de {self.postulacion_id} - {self.fecha:%Y-%m-%d}"