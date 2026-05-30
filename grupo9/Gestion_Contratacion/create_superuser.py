import os
import django

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'gestion_contratacion.settings'
)

django.setup()

from accounts.models import User


def crear_o_actualizar_usuario(
    username,
    password,
    email,
    role,
    superuser=False
):

    user = User.objects.filter(username=username).first()

    if user:
        # ACTUALIZAR password y rol
        user.email = email
        user.role = role
        user.set_password(password)  # 🔥 HASH correcto
        user.save()

        print(f"🔄 Usuario {username} actualizado")

    else:
        if superuser:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                role=role
            )
            print(f"✅ Superusuario {username} creado")

        else:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role
            )
            print(f"✅ Usuario {username} creado")


# ADMIN
crear_o_actualizar_usuario(
    username='admin',
    password='123456',
    email='admin@gmail.com',
    role='reclutador',
    superuser=True
)

# RECLUTADOR
crear_o_actualizar_usuario(
    username='juan',
    password='123456',
    email='juan@gmail.com',
    role='reclutador'
)

# CANDIDATO
crear_o_actualizar_usuario(
    username='laura',
    password='123456',
    email='laura@gmail.com',
    role='candidato'
)

print("✅ Usuarios verificados correctamente")