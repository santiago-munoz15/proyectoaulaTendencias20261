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

    def save(self, *args, **kwargs):
        previo_estado = None
        if self.pk:
            try:
                previo_estado = Postulacion.objects.get(pk=self.pk).estado
            except Postulacion.DoesNotExist:
                previo_estado = None

        super().save(*args, **kwargs)

        # Si hubo una transición a 'aprobado', generar contrato si no existe
        if previo_estado != 'aprobado' and self.estado == 'aprobado':
            # Evitar crear múltiples contratos
            if not hasattr(self, 'contrato'):
                Contrato.objects.create(
                    postulacion=self,
                    vacante=self.vacante,
                    cargo=self.vacante.titulo,
                    area=self.vacante.area,
                    candidato_nombre=self.candidato.username,
                    estado_postulacion=self.estado,
                    fecha_inicio=None,
                    tipo_contrato='indefinido',
                    salario=None,
                )

            self.vacante.cerrar_automaticamente_si_corresponde()


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


class Contrato(models.Model):
    TIPOS = (
        ('indefinido', 'Indefinido'),
        ('temporal', 'Temporal'),
        ('por_proyecto', 'Por proyecto'),
    )

    postulacion = models.OneToOneField(
        Postulacion,
        on_delete=models.CASCADE,
        related_name='contrato'
    )

    vacante = models.ForeignKey(
        Vacante,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contratos'
    )

    cargo = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True)
    candidato_nombre = models.CharField(max_length=150)
    estado_postulacion = models.CharField(max_length=20, default='aprobado')

    fecha_inicio = models.DateField(null=True, blank=True)
    tipo_contrato = models.CharField(max_length=20, choices=TIPOS, default='indefinido')
    salario = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f"Contrato {self.postulacion_id} - {self.cargo}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.vacante:
            self.vacante.cerrar_automaticamente_si_corresponde()