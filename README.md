**Proyecto: Sistema de Gestión (mi-sistema-tech)**

Breve descripción
- **Propósito:** Monorepo con una API backend (Node.js + Express) y dos frontends en Angular (un panel administrativo SPA y un catálogo público SSR). Pensado para gestionar clientes, productos, pedidos, stock, notificaciones vía WhatsApp, pagos con MercadoPago y **créditos/cuotas**.

**Stack principal**
- **Backend:** Node.js, Express, MySQL. Ejecución y migraciones automáticas en [backend/src/server.js](backend/src/server.js).
- **Frontend Admin:** Angular (v21) SPA — panel administrativo.
- **Frontend Público:** Angular (v21) SSR (Server-Side Rendering) — catálogo para SEO.
- **Servicios externos:** MercadoPago (`MP_ACCESS_TOKEN`) y WhatsApp Business API (`WHATSAPP_API_URL`, `WHATSAPP_TOKEN`).

**Características Recientes (Hardening, Testing & UI)**
- **UI/UX Dark Tech:** Nuevo sistema de diseño con paleta de colores personalizada (Signal Blue, Slate, Void), tipografía geométrica (Space Grotesk) y diseño minimalista enfocado en la usabilidad tanto para e-commerce como admin.
- Pruebas de integración automatizadas con Jest y Supertest para módulos críticos (como Créditos).
- Seguridad robusta (Helmet, CORS restrictivo, Rate Limiting, bcrypt factor 12, JWT 15m).
- Rendimiento optimizado (Compresión GZIP, Lazy Loading en Angular, Índices en DB, SSR para catálogo).

**Estructura del repositorio**
- **backend:** API, modelos, rutas, servicios y migraciones. Revisa [backend/package.json](backend/package.json).
- **frontend:** Aplicación Angular (admin y público). Revisa [frontend/package.json](frontend/package.json).
- **migrations:** Scripts SQL en `backend/migrations/`.

**Requisitos previos**
- Node.js (versión 20 LTS recomendada) y npm.
- MySQL 8.

**Instalación y ejecución (desarrollo)**

Backend
1. Entra en la carpeta del backend: `cd backend`
2. Instala dependencias y ejecuta: `npm install && npm run dev`
*El servidor ejecuta automáticamente las migraciones definidas.*

Frontend
1. Entra en la carpeta del frontend: `cd frontend`
2. Instala dependencias y arranca la app Angular: `npm install && npm start`

**Variables de entorno importantes (backend)**
- Usa [backend/.env.example](backend/.env.example) como plantilla.
- Variables principales:
  - `PORT` — puerto del servidor (por defecto 3000).
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — conexión MySQL.
  - `MP_ACCESS_TOKEN` — token de MercadoPago.
  - `WHATSAPP_API_URL`, `WHATSAPP_TOKEN` — credenciales para WhatsApp API.
  - `JWT_SECRET` — secreto para firmar tokens.
  - `FRONTEND_URL` — dominio del frontend para CORS.

**Rutas y API básicas**
- Endpoints principales (`/api`):
  - `/productos` — catálogo e inventario.
  - `/clientes` — gestión de clientes.
  - `/pedidos` — gestión de pedidos y pasarela de pago.
  - `/creditos` — gestión de créditos y pago de cuotas.
  - `/stock` — control de stock.
  - `/whatsapp` — envío de notificaciones.
  - `/auth` — autenticación y tokens.

**Despliegue**
- **Admin (SPA):** `ng build --configuration production` (servir estáticos con Nginx).
- **Público (SSR):** `ng build` y ejecutar `server.mjs` con Node/PM2 en el puerto 4000.
- **Backend:** Usar PM2 (`pm2 start src/server.js`) con variables de producción. Reverse proxy con Nginx apuntando al puerto 3000.
