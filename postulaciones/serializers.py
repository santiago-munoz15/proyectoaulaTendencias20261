from rest_framework import serializers

from .models import Entrevista, Postulacion


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
        ]
        read_only_fields = ['candidato', 'fecha_postulacion', 'entrevistas', 'vacante_titulo', 'vacante_area']

    def validate(self, attrs):
        request = self.context.get('request')

        if request and request.method == 'POST':
            vacante = attrs.get('vacante')
            if not vacante:
                raise serializers.ValidationError('Debes enviar una vacante válida.')

            if vacante.estado != 'activa':
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

        return attrs

    def update(self, instance, validated_data):
        estado = validated_data.get('estado')
        if estado:
            instance.estado = estado
            instance.save(update_fields=['estado'])
        return instance