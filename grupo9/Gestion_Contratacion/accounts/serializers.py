from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

RECLUTADOR_INVITE_CODE = 'RECLUTADOR01'

class UserSerializer(serializers.ModelSerializer):
    invite_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'role', 'invite_code']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        role = attrs.get('role')
        invite_code = attrs.get('invite_code', '')

        if role == 'reclutador' and invite_code != RECLUTADOR_INVITE_CODE:
            raise serializers.ValidationError({'invite_code': 'Código de invitación inválido para registrar reclutadores.'})

        return attrs

    def create(self, validated_data):
        validated_data.pop('invite_code', None)
        user = User.objects.create_user(**validated_data)
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['role'] = user.role

        return token