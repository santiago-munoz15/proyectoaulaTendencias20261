from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from vacantes.models import Vacante


class Postulacion(models.Model):

    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
    )

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
        max_length=10,
        choices=ESTADOS,
        default='pendiente'
    )

    class Meta:
        unique_together = ('candidato', 'vacante')  # evita duplicados

    def __str__(self):
        return f"{self.candidato} - {self.vacante}"