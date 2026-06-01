from django.contrib import admin

from .models import Postulacion, Entrevista, Contrato


@admin.register(Postulacion)
class PostulacionAdmin(admin.ModelAdmin):
	list_display = ('id', 'candidato', 'vacante', 'estado', 'fecha_postulacion')
	list_filter = ('estado', 'fecha_postulacion')


@admin.register(Entrevista)
class EntrevistaAdmin(admin.ModelAdmin):
	list_display = ('id', 'postulacion', 'fecha', 'modalidad', 'entrevistador')
	list_filter = ('modalidad',)


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
	list_display = ('id', 'postulacion', 'vacante', 'tipo_contrato', 'salario', 'creado_en')
	list_filter = ('tipo_contrato',)
