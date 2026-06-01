from django.db import models
from django.conf import settings
from django.utils import timezone


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

    @property
    def esta_vencida(self):
        return self.fecha_limite < timezone.localdate()

    @property
    def esta_cubierta(self):
        return self.contratos.exists()

    def cerrar_automaticamente_si_corresponde(self):
        if self.estado == 'activa' and (self.esta_vencida or self.esta_cubierta):
            self.estado = 'cerrada'
            self.save(update_fields=['estado'])
        return self.estado