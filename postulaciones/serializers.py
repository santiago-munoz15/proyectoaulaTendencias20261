from rest_framework import serializers
from .models import Postulacion


class PostulacionSerializer(serializers.ModelSerializer):

    candidato = serializers.ReadOnlyField(source='candidato.username')

    class Meta:
        model = Postulacion
        fields = '__all__'
        read_only_fields = ['candidato']

    def validate(self, attrs):
        request = self.context.get('request')

        if request and request.method == 'POST':
            vacante = attrs.get('vacante')
            if not vacante:
                raise serializers.ValidationError('Debes enviar una vacante valida.')

            if Postulacion.objects.filter(candidato=request.user, vacante=vacante).exists():
                raise serializers.ValidationError('Ya te postulaste a esta vacante.')

        return attrs

    def update(self, instance, validated_data):
        request = self.context.get('request')

        #Solo reclutador puede cambiar estado
        if request.user.role != 'reclutador':
            raise serializers.ValidationError(
                "No tienes permiso para modificar esta postulación"
            )

        instance.estado = validated_data.get('estado', instance.estado)
        instance.save()
        return instance