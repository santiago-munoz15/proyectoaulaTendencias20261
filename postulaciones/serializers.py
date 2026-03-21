from rest_framework import serializers
from .models import Postulacion


class PostulacionSerializer(serializers.ModelSerializer):

    candidato = serializers.ReadOnlyField(source='candidato.username')

    class Meta:
        model = Postulacion
        fields = '__all__'
        read_only_fields = ['candidato', 'vacante']

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