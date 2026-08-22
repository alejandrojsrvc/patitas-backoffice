# Patitas Backoffice

Panel operativo React para administrar catálogo, proveedores y precios de Patitas.

## Desarrollo local

Requisitos:

- API Patitas ejecutándose en `http://localhost:3000`.
- Node.js 20 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. Vite redirige las
peticiones `/api` al backend para evitar problemas de CORS durante el desarrollo.

El contrato consumido es `http://localhost:3000/api/v1/docs-json`. Para usar otro
origen, copiar `.env.example` a `.env.local` y cambiar `VITE_API_URL`.

## Acceso

El acceso real usa `POST /api/v1/auth/login` y requiere un usuario con rol `ADMIN`.

## Despliegue

Producción se despliega mediante GitHub Actions y Vercel CLI, sin integración Git
nativa de Vercel. El workflow está en
`.github/workflows/deploy-production.yml` y se ejecuta al subir cambios a `main` o
manualmente desde la pestaña Actions.

Antes de habilitarlo, configurar en GitHub:

- Secret `VERCEL_TOKEN`.
- Secret `VERCEL_ORG_ID`.
- Secret `VERCEL_PROJECT_ID`.
- Variable `VERCEL_DEPLOY_ENABLED=true`.

La URL pública de la API se configura como `VITE_API_URL` en el ambiente Production
del proyecto de Vercel. Después de cambiarla hay que ejecutar nuevamente el workflow.
