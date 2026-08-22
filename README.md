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
La pantalla de ingreso también incluye un modo demostración que no escribe en la API.
