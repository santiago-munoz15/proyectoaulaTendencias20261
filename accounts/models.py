from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLES = (
        ('reclutador', 'Reclutador'),
        ('candidato', 'Candidato'),
    )
    role = models.CharField(max_length=20, choices=ROLES)