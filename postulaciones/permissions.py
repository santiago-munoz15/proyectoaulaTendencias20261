from rest_framework.permissions import BasePermission

class IsCandidato(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'candidato'

class IsReclutador(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'reclutador'
        )