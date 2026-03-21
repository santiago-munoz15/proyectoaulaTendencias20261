from django.contrib import admin
from .models import Candidato


@admin.register(Candidato)
class CandidatoAdmin(admin.ModelAdmin):
	list_display = ('id', 'nombre', 'correo', 'telefono', 'creado_en')
	search_fields = ('nombre', 'correo', 'telefono')
