# Misión 404 · Recupera el sistema de la academia

Aplicación web full-stack con centro de control interactivo, cinco misiones de recuperación, validación en servidor y persistencia real en MongoDB Atlas (`mision_404`).

## Estructura

- `package.json` se encuentra en la **raíz del repositorio** (`/`).
- **Frontend**: React + Vite + Tailwind CSS (`src/`), comunicándose mediante rutas relativas `/api/*`.
- **Backend**: Servidor Express (`server.ts`) que escucha en `0.0.0.0` usando `process.env.PORT` (por defecto `3000`), sirve el frontend compilado (`dist/`) en producción y lee `process.env.MONGODB_URI` únicamente en el servidor.
- **Base de datos**: MongoDB Atlas (`mision_404`) con las colecciones `challenges` y `runs`. Si `MONGODB_URI` no está disponible o Atlas no conecta, muestra `MongoDB desconectado` sin sustituir por datos locales.

## Despliegue en Render (Web Service único)

| Dato | Valor comprobado |
| :--- | :--- |
| **Root Directory** | *(vacío)* — `package.json` está en la raíz del repositorio |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### Variable de entorno necesaria en Render

Configura de forma privada en **Environment Variables** (sin incluir credenciales en el código ni en GitHub):

- `MONGODB_URI`: Cadena de conexión completa de MongoDB Atlas (`mongodb+srv://...` apuntando a la base `mision_404`).
- *(No añadas `PORT`: Render asigna automáticamente `process.env.PORT`).*

## Comandos en local

```bash
npm install
npm run dev
```

Para compilar y ejecutar la versión de producción:

```bash
npm run build
npm start
```
