# Frontend de contratación

Aplicación React + Vite para consumir la API de contratación.

## Desarrollo local

```bash
npm install
npm run dev
```

Configura la URL de la API en un archivo `.env` dentro de `frontend/`:

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```

## Despliegue en Vercel

1. Importa la carpeta `frontend` como proyecto en Vercel.
2. Define la variable de entorno `VITE_API_URL` con la URL pública del backend.
3. Usa el comando de build `npm run build`.
4. El directorio de salida es `dist`.

Si el backend está en Render o Neon, solo necesitas actualizar la variable `VITE_API_URL` cuando cambie la URL pública.
