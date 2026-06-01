from rest_framework import serializers

from .models import Entrevista, Postulacion
from .models import Contrato


class EntrevistaSerializer(serializers.ModelSerializer):
    entrevistador = serializers.ReadOnlyField(source='entrevistador.username')
    postulacion_detalle = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Entrevista
        fields = [
            'id',
            'postulacion',
            'postulacion_detalle',
            'fecha',
            'modalidad',
            'entrevistador',
            'observaciones',
            'creada_en',
        ]
        read_only_fields = ['entrevistador', 'creada_en', 'postulacion_detalle']

    def get_postulacion_detalle(self, obj):
        return {
            'id': obj.postulacion_id,
            'estado': obj.postulacion.estado,
            'vacante': obj.postulacion.vacante.titulo,
            'candidato': obj.postulacion.candidato.username,
        }

    def validate(self, attrs):
        request = self.context.get('request')
        postulacion = attrs.get('postulacion') or getattr(self.instance, 'postulacion', None)

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Debes autenticarte para registrar entrevistas.')

        if request.user.role != 'reclutador':
            raise serializers.ValidationError('Solo un reclutador puede registrar entrevistas.')

        if postulacion is None:
            raise serializers.ValidationError('Debes enviar una postulación válida.')

        if postulacion.vacante.creado_por_id != request.user.id:
            raise serializers.ValidationError('Solo puedes entrevistar postulaciones de tus vacantes.')

        if not postulacion.es_activa:
            raise serializers.ValidationError('Solo se pueden entrevistar postulaciones activas.')

        return attrs

    def create(self, validated_data):
        request = self.context['request']
        entrevista = Entrevista.objects.create(
            entrevistador=request.user,
            **validated_data,
        )

        postulacion = entrevista.postulacion
        if postulacion.estado == 'en_revision':
            postulacion.estado = 'entrevistado'
            postulacion.save(update_fields=['estado'])

        return entrevista


class PostulacionSerializer(serializers.ModelSerializer):

    candidato = serializers.ReadOnlyField(source='candidato.username')
    vacante_titulo = serializers.ReadOnlyField(source='vacante.titulo')
    vacante_area = serializers.ReadOnlyField(source='vacante.area')
    entrevistas = EntrevistaSerializer(many=True, read_only=True)
    contrato = serializers.SerializerMethodField(read_only=True)
    contrato_fecha_inicio = serializers.DateField(write_only=True, required=False, allow_null=True)
    contrato_tipo_contrato = serializers.ChoiceField(write_only=True, required=False, choices=Contrato.TIPOS)
    contrato_salario = serializers.DecimalField(write_only=True, required=False, allow_null=True, max_digits=12, decimal_places=2)

    class Meta:
        model = Postulacion
        fields = [
            'id',
            'candidato',
            'vacante',
            'vacante_titulo',
            'vacante_area',
            'fecha_postulacion',
            'estado',
            'entrevistas',
            'contrato',
            'contrato_fecha_inicio',
            'contrato_tipo_contrato',
            'contrato_salario',
        ]
        read_only_fields = ['candidato', 'fecha_postulacion', 'entrevistas', 'vacante_titulo', 'vacante_area', 'contrato']

    def validate(self, attrs):
        request = self.context.get('request')

        if request and request.method == 'POST':
            vacante = attrs.get('vacante')
            if not vacante:
                raise serializers.ValidationError('Debes enviar una vacante válida.')

            vacante.cerrar_automaticamente_si_corresponde()

            if vacante.estado != 'activa':
                if vacante.esta_vencida:
                    raise serializers.ValidationError('No puedes postularte a una vacante vencida.')

                if vacante.esta_cubierta:
                    raise serializers.ValidationError('No puedes postularte a una vacante ya cubierta.')

                if vacante.estado == 'cerrada':
                    raise serializers.ValidationError('No puedes postularte a una vacante cerrada.')

                raise serializers.ValidationError('Solo puedes postularte a vacantes activas.')

            if Postulacion.objects.filter(candidato=request.user, vacante=vacante).exists():
                raise serializers.ValidationError('Ya te postulaste a esta vacante.')

        if self.instance and 'estado' in attrs:
            if not request or request.user.role != 'reclutador':
                raise serializers.ValidationError('No tienes permiso para modificar esta postulación.')

            nuevo_estado = attrs['estado']
            if nuevo_estado == self.instance.estado:
                return attrs

            if not self.instance.puede_transicionar_a(nuevo_estado):
                raise serializers.ValidationError(
                    'Transición de estado inválida. Sigue el flujo: en revisión -> entrevistado -> aprobado/rechazado.'
                )

            if nuevo_estado == 'aprobado':
                missing_fields = []
                if 'contrato_fecha_inicio' not in attrs:
                    missing_fields.append('contrato_fecha_inicio')
                if 'contrato_tipo_contrato' not in attrs:
                    missing_fields.append('contrato_tipo_contrato')
                if 'contrato_salario' not in attrs:
                    missing_fields.append('contrato_salario')
                if missing_fields:
                    raise serializers.ValidationError({field: 'Este campo es obligatorio al aprobar la postulación.' for field in missing_fields})

        return attrs

    def update(self, instance, validated_data):
        estado = validated_data.get('estado')
        if estado:
            instance.estado = estado
            instance.save(update_fields=['estado'])

            if estado == 'aprobado':
                contrato_defaults = {
                    'vacante': instance.vacante,
                    'cargo': instance.vacante.titulo,
                    'area': instance.vacante.area,
                    'candidato_nombre': instance.candidato.username,
                    'estado_postulacion': instance.estado,
                    'fecha_inicio': validated_data.get('contrato_fecha_inicio'),
                    'tipo_contrato': validated_data.get('contrato_tipo_contrato'),
                    'salario': validated_data.get('contrato_salario'),
                }
                Contrato.objects.update_or_create(postulacion=instance, defaults=contrato_defaults)
        return instance

    def get_contrato(self, obj):
        contrato = getattr(obj, 'contrato', None)
        if not contrato:
            return None
        return {
            'id': contrato.id,
            'vacante': contrato.vacante.titulo if contrato.vacante else None,
            'cargo': contrato.cargo,
            'area': contrato.area,
            'candidato_nombre': contrato.candidato_nombre,
            'estado_postulacion': contrato.estado_postulacion,
            'fecha_inicio': contrato.fecha_inicio,
            'tipo_contrato': contrato.tipo_contrato,
            'salario': contrato.salario,
            'creado_en': contrato.creado_en,
        }


class ContratoSerializer(serializers.ModelSerializer):
    postulacion_detalle = serializers.SerializerMethodField(read_only=True)
    vacante_titulo = serializers.ReadOnlyField(source='vacante.titulo')
    candidato = serializers.ReadOnlyField(source='postulacion.candidato.username')

    class Meta:
        model = Contrato
        fields = [
            'id',
            'postulacion',
            'postulacion_detalle',
            'vacante',
            'vacante_titulo',
            'candidato',
            'cargo',
            'area',
            'candidato_nombre',
            'estado_postulacion',
            'fecha_inicio',
            'tipo_contrato',
            'salario',
            'creado_en',
        ]
        read_only_fields = ['postulacion_detalle', 'vacante_titulo', 'candidato', 'cargo', 'area', 'candidato_nombre', 'estado_postulacion', 'creado_en']

    def get_postulacion_detalle(self, obj):
        return {
            'id': obj.postulacion_id,
            'estado': obj.postulacion.estado,
            'vacante': obj.postulacion.vacante.titulo,
            'candidato': obj.postulacion.candidato.username,
        }