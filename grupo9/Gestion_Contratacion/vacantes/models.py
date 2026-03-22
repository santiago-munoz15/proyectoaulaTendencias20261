from django.db import models
from django.conf import settings


class Vacante(models.Model):

    ESTADOS = [
        ('activa', 'Activa'),
        ('cerrada', 'Cerrada'),
        ('pausada', 'Pausada'),
    ]

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    area = models.CharField(max_length=100)

    # Se crea automáticamente
    fecha_publicacion = models.DateTimeField(auto_now_add=True)

    fecha_limite = models.DateField()

    estado = models.CharField(
        max_length=10,
        choices=ESTADOS,
        default='activa'
    )

    # Relación con el usuario (RECLUTADOR)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vacantes'
    )

    def __str__(self):
        return f"{self.titulo} - {self.estado}"