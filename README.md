# TechOps Manager & E-commerce

Sistema propio de gestión operativa y e-commerce para un negocio de tecnología ("Cel Shop Center"), pensado para digitalizar y automatizar procesos que hoy viven en cuadernos y planillas sueltas: clientes, ventas a crédito, cobranzas por WhatsApp, stock y catálogo público — todo en un software 100% propio, sin licencias de terceros.

Es un monorepo con una API backend (Node.js + Express + MySQL) y dos aplicaciones Angular: un **panel administrativo** (SPA) y un **catálogo público** (SSR, optimizado para SEO y carga rápida).

## Stack Tecnológico

### Backend

- Node.js + Express 5
- MySQL (mysql2, pool de conexiones + transacciones)
- Migraciones SQL versionadas y auto-aplicadas al arrancar (`backend/migrations/`)
- JWT (15 min de expiración) + bcrypt para autenticación del panel admin
- `express-validator` para validación de entrada, `express-rate-limit` + `helmet` + CORS restrictivo para seguridad
- `node-cron` para tareas programadas (cobranzas automáticas, marcado de cuotas vencidas)
- Integraciones: **MercadoPago** (pagos) y **WhatsApp** (recordatorios de cobranza)
- Jest + Supertest para tests de integración

### Frontend

- Angular 21 — Standalone Components, Signals (`signal`, `computed`, `toSignal`), control flow nativo (`@if`/`@for`)
- Angular Material (tablas, diálogos, stepper, selects, snackbars)
- Angular Universal (SSR) para el catálogo público
- CSS propio con sistema de diseño "Dark Tech" (paleta de variables CSS: `--void`, `--slate`, `--signal`, `--white`, etc. en `frontend/src/styles.css`) — sin Tailwind
- Playwright para tests end-to-end

## Módulos y Funcionalidades

### 🖥️ Panel Administrador
Dashboard, CRUD de clientes, productos, pedidos, stock y créditos, protegidos con `AuthGuard` + interceptor HTTP que inyecta el token JWT y desloguea automáticamente ante un 401.

### 📊 Dashboard Interactivo
KPIs generales (clientes, productos, stock bajo, pedidos pendientes, créditos activos, cuotas vencidas) y un widget de **Ventas del Mes** con el total recaudado siempre visible y un desglose de ventas por producto en un **acordeón desplegable** (`Ver desglose de productos` / `Ocultar desglose`, con transición animada y chevron rotatorio).

### 💳 Módulo de Créditos

- Wizard de 4 pasos (Cliente → Producto → Configurar Pago → Confirmación) que genera automáticamente las cuotas según cantidad y frecuencia (semanal/mensual), con fechas de vencimiento calculadas.
- Vista de detalle con resumen del crédito (cliente, producto, saldo pendiente destacado) y tabla de cuotas con estados semánticos (pagada / pendiente / vencida) y registro de pagos.
- Anulación transaccional de créditos (bloqueada si ya tienen pagos registrados), con reversión de cuotas y cuenta corriente asociada.
- **Historial crediticio del cliente**: al liquidar un crédito por completo, se actualiza automáticamente a "Bueno"/"Excelente" y se muestra como badge "Cliente Cumplidor" en la lista y ficha del cliente.

### 📲 Automatización de Cobranzas por WhatsApp

- Cron diario (09:00) que recorre cuotas por vencer (hoy/mañana) o vencidas sin recordatorio reciente, y envía un mensaje dinámico por WhatsApp con los datos del cliente y el link de pago, registrando la fecha del último recordatorio para evitar spam.
- Envío manual e inmediato de recordatorio por cuota desde la tabla de detalle del crédito, con feedback visual de éxito/error.

### 📦 Gestión de Stock
Identificación de productos por código de barras (pistola láser por emulación de teclado, o cámara web vía `html5-qrcode`) y registro de movimientos de inventario (ingreso/egreso/ajuste), con historial de movimientos recientes.

### 🛒 Catálogo Web Público
Storefront en Angular con SSR, sincronizado en tiempo real con el stock del backend, carrito de compras y checkout integrado con MercadoPago.

## Instalación y Ejecución (desarrollo)

### Requisitos previos

- Node.js 20 LTS o superior + npm
- MySQL 8

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # completar DB_*, JWT_SECRET, MP_ACCESS_TOKEN, WHATSAPP_*, etc.
```

Crear la base de datos vacía en MySQL (el nombre debe coincidir con `DB_NAME` del `.env`):

```sql
CREATE DATABASE cel_shop_center_db;
```

Levantar el servidor (aplica las migraciones automáticamente al iniciar):

```bash
npm run dev
```

Poblar la base de datos con datos de prueba (clientes, productos, créditos, usuarios admin):

```bash
npm run seed
```

Usuario admin de prueba tras el seed: `admin` / `admin123`.

Correr los tests de integración:

```bash
npm test
```

### 2. Frontend

```bash
cd frontend
npm install
npm start        # levanta el panel admin (Angular SPA) en http://localhost:4200
```

Para el catálogo público con SSR:

```bash
npm run build
npm run serve:ssr:frontend
```

## Estructura del repositorio

```text
backend/
  migrations/          # SQL versionado, aplicado automáticamente al arrancar
  src/
    controllers/        # Lógica de request/response por recurso
    services/            # Reglas de negocio (créditos, notificaciones, cron)
    repositories/        # Acceso a datos (queries SQL)
    routes/               # Definición de endpoints /api/*
    middleware/           # Autenticación, validaciones
  scripts/seed.js       # Seeder de datos de prueba

frontend/
  src/app/
    pages/               # Vistas: dashboard, clientes, productos, pedidos, créditos, stock, público
    components/           # Componentes reutilizables (layout, scanner de barras, etc.)
    services/              # Clientes HTTP por recurso
    interceptors/           # Inyección de JWT + manejo de 401
```

## API — endpoints principales (`/api`)

|Recurso|Descripción|
|-|-|
|`/auth`|Login y emisión de tokens JWT|
|`/clientes`|CRUD de clientes + historial crediticio|
|`/productos`|Catálogo e inventario|
|`/pedidos`|Pedidos y pasarela de pago (MercadoPago)|
|`/creditos`|Créditos, cuotas, anulación|
|`/cuotas`|Registro de pago y envío manual de recordatorio|
|`/stock`|Movimientos e identificación de productos|
|`/whatsapp`|Envío de notificaciones|
|`/dashboard`|KPIs y desglose de ventas del mes|

## Variables de entorno (backend)

Usar [backend/.env.example](backend/.env.example) como plantilla. Variables principales:

- `PORT` — puerto del servidor (por defecto 3000)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — conexión MySQL
- `JWT_SECRET` — secreto para firmar tokens (generar con `openssl rand -hex 32`)
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` — MercadoPago
- `WHATSAPP_API_URL`, `WHATSAPP_TOKEN` — WhatsApp API
- `FRONTEND_URL`, `FRONTEND_SUCCESS_URL`, `FRONTEND_FAILURE_URL`, `FRONTEND_PENDING_URL` — CORS y redirecciones post-pago

## Despliegue

- **Admin (SPA):** `ng build --configuration production`, servir estáticos con Nginx.
- **Público (SSR):** `ng build` y ejecutar `dist/frontend/server/server.mjs` con Node/PM2.
- **Backend:** `pm2 start src/server.js` con variables de entorno de producción, detrás de un reverse proxy Nginx.
