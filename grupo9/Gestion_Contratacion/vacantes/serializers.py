from rest_framework import serializers
from .models import Vacante


class VacanteSerializer(serializers.ModelSerializer):

    # No se envía en POST, se muestra en respuesta
    creado_por = serializers.ReadOnlyField(source='creado_por.username')

    class Meta:
        model = Vacante
        fields = '__all__'

    def validate(self, data):
        """
        Validación de fechas:
        - fecha_limite debe ser mayor o igual a hoy
        """

        fecha_limite = data.get('fecha_limite')

        if fecha_limite:
            from datetime import date
            if fecha_limite < date.today():
                raise serializers.ValidationError(
                    "La fecha límite no puede ser menor a la fecha actual"
                )

        return data