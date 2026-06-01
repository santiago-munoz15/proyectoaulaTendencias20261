# Gestion de Contratacion - API DRF

API en Django Rest Framework para gestionar autenticacion, vacantes, candidatos y postulaciones.

## Requisitos

- Python 3.10+
- Entorno virtual activo
- Dependencias instaladas: `pip install -r requirements.txt`

## Ejecucion

1. Aplicar migraciones:

```bash
python manage.py migrate
```

2. Iniciar servidor:

```bash
python manage.py runserver
```

Base URL: `http://127.0.0.1:8000`

## Autenticacion

La API usa JWT con `Authorization: Bearer <token>`.

### Endpoints de autenticacion

- `POST /api/auth/register/` crear usuario (roles: `reclutador` o `candidato`)
- `POST /api/auth/login/` obtener `access` y `refresh`
- `POST /api/auth/refresh/` renovar token
- `GET /api/auth/me/` usuario autenticado

### Registro de usuarios

- Un candidato puede registrarse directamente enviando `username`, `email`, `password` y el rol `candidato`.
- Un reclutador solo puede registrarse si envía el código de invitacion `RECLUTADOR01` junto con el rol `reclutador`.
- Si el código no coincide, el backend rechaza el registro del reclutador.

## Endpoints de vacantes

- `GET /api/vacantes/` listar
- `POST /api/vacantes/` crear (solo reclutador)
- `GET /api/vacantes/{id}/` detalle
- `PATCH /api/vacantes/{id}/` editar (solo reclutador)
- `DELETE /api/vacantes/{id}/` eliminar (solo reclutador)

Campos: `titulo`, `descripcion`, `area`, `fecha_publicacion`, `fecha_limite`, `estado` (`activa`, `cerrada`, `pausada`).

Filtros soportados:

- `?estado=activa`
- `?area=TI`
- `?search=python`

## Endpoints de candidatos

- `GET /api/candidatos/` listar
- `POST /api/candidatos/` crear
- `GET /api/candidatos/{id}/` detalle
- `PATCH /api/candidatos/{id}/` editar
- `DELETE /api/candidatos/{id}/` eliminar

Campos: `nombre`, `correo`, `telefono`, `perfil_profesional`, `hoja_vida` (URL o texto).

## Endpoints de postulaciones

- `GET /api/postulaciones/` listar
- `POST /api/postulaciones/` crear (solo candidato)
- `GET /api/postulaciones/{id}/` detalle
- `PATCH /api/postulaciones/{id}/` actualizar estado (solo reclutador)
- `DELETE /api/postulaciones/{id}/` eliminar (solo reclutador)

Flujo de estados:

- `en_revision` -> `entrevistado` -> `aprobado` / `rechazado`
- No se permiten transiciones inválidas.

Notas:

- Al crear, `estado` inicia en `en_revision`.
- No se permiten postulaciones duplicadas para la misma pareja candidato-vacante.

## Endpoints de entrevistas

- `GET /api/entrevistas/` listar
- `POST /api/entrevistas/` registrar entrevista (solo reclutador)
- `GET /api/entrevistas/{id}/` detalle

Campos: `postulacion`, `fecha`, `modalidad` (`virtual`, `presencial`, `telefonica`), `entrevistador`, `observaciones`.

La API incluye las entrevistas asociadas dentro del detalle de cada postulación.

## Flujo rapido de prueba

1. Registrar reclutador y candidato.
2. Login de reclutador y crear vacante.
3. Login de candidato y crear postulacion enviando `vacante`.
4. Login de reclutador y registrar entrevista para esa postulacion.
5. Login de reclutador y actualizar `estado` de la postulacion siguiendo el flujo permitido.

## Evidencia de integracion backend + frontend

El frontend en `frontend/src/App.jsx` consume la API DRF en estos flujos clave:

- Login con JWT: `POST /api/auth/login/`
- Carga de vacantes: `GET /api/vacantes/`
- Postulacion de candidato: `POST /api/postulaciones/`
- Cambio de estado por reclutador: `PATCH /api/postulaciones/{id}/`
- Registro de entrevista: `POST /api/entrevistas/`
- Consulta de entrevistas embebidas en postulacion: `GET /api/postulaciones/`

Validacion automatizada del backend:

- `accounts/tests.py`: autenticacion (`login` y `me`).
- `vacantes/tests.py`: permisos por rol para gestionar vacantes.
- `postulaciones/tests.py`: control de flujo de estados, restricciones por rol y registro de entrevistas.

## Despliegue final

Arquitectura recomendada con servicios gratuitos:

- Frontend: Vercel
- Backend Django: Render
- Base de datos PostgreSQL: Neon o Render PostgreSQL

### Frontend en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, importa el proyecto y selecciona la carpeta `frontend` como root.
3. Configura la variable de entorno:

```bash
VITE_API_URL=https://<tu-backend>/api
```

4. Usa el build command `npm run build`.

### Backend en Render

1. Crea un Web Service apuntando al repositorio raíz.
2. Usa el comando de build:

```bash
./build.sh
```

3. Usa el start command:

```bash
gunicorn gestion_contratacion.wsgi
```

4. Define variables de entorno:

```bash
DATABASE_URL=<url-postgres>
SECRET_KEY=<clave-segura>
DEBUG=False
```

### Base de datos

Si el grupo prefiere un servicio gratuito separado para la base de datos, Neon funciona bien con `DATABASE_URL`. Si no se define, el proyecto cae a SQLite en local para desarrollo.

### Flujo final desplegado

1. Ingresa al frontend desplegado en Vercel y accede con tu usuario y contraseña.
2. Si eres reclutador, entra al módulo de vacantes y crea una nueva vacante con título, descripción, área y fecha límite.
3. El candidato inicia sesión con su propia cuenta, revisa las vacantes activas y selecciona la opción para postularse.
4. El reclutador entra al módulo de postulaciones, revisa la solicitud del candidato y cambia su estado siguiendo el flujo permitido: en revisión, entrevistado, aprobado o rechazado.
5. Si la postulación pasa a entrevistado, el reclutador puede registrar una entrevista con fecha, modalidad y observaciones.
6. Cuando la postulación se aprueba, el sistema genera el contrato automáticamente y muestra los datos del cargo asociados a esa selección.
7. El reclutador completa en la interfaz los datos faltantes del contrato, como fecha de inicio, tipo de contrato y salario.
8. Desde el módulo de reportes, el reclutador puede consultar el embudo de selección con datos reales de las postulaciones almacenadas.
9. Si la vacante se cubre o vence, el sistema la cierra automáticamente y ya no permite nuevas postulaciones.
