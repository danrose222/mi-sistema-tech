# TechOps Manager & E-commerce

Sistema propio de gestión operativa y e-commerce para un negocio de tecnología ("Cel Shop Center"), pensado para digitalizar y automatizar procesos que hoy viven en cuadernos y planillas sueltas: clientes, ventas a crédito, cobranzas por WhatsApp, stock y catálogo público — todo en un software 100% propio, sin licencias de terceros.

Es un monorepo con una API backend (Node.js + Express + MySQL) y dos aplicaciones Angular: un **panel administrativo** (SPA, responsivo) y un **catálogo público** (SSR, mobile-first, optimizado para SEO y carga rápida).

## Stack Tecnológico

### Backend

- Node.js + Express 5
- MySQL (mysql2, pool de conexiones + transacciones)
- Migraciones SQL versionadas y auto-aplicadas al arrancar (`backend/migrations/`)
- JWT (15 min de expiración) + bcrypt para autenticación del panel admin
- `multer` para la subida de imágenes de productos (disco local, servidas como estáticos en `/uploads`)
- `express-validator` para validación de entrada, `express-rate-limit` + `helmet` + CORS restrictivo para seguridad
- `node-cron` para tareas programadas (cobranzas automáticas, marcado de cuotas vencidas)
- Integraciones: **MercadoPago** (pagos) y **WhatsApp** (recordatorios de cobranza)
- Jest + Supertest para tests de integración

### Frontend

- Angular 21 — Standalone Components, Signals (`signal`, `computed`, `toSignal`), control flow nativo (`@if`/`@for`)
- Angular Material (tablas, diálogos, stepper, selects, snackbars)
- Angular Universal (SSR) para el catálogo público
- CSS propio con sistema de diseño "Dark Tech" (paleta de variables CSS: `--void`, `--slate`, `--signal`, `--white`, etc. en `frontend/src/styles.css`) — sin Tailwind, diseño mobile-first en todo el sitio público y el panel admin
- Playwright para tests end-to-end

## Módulos y Funcionalidades

### 🖥️ Panel Administrador

CRUD de clientes, productos, pedidos, stock y créditos, protegido con `AuthGuard` + interceptor HTTP que inyecta el token JWT y desloguea automáticamente ante un 401. Layout responsivo: sidebar fijo en desktop, menú lateral colapsable (overlay + backdrop) en mobile.

### 📊 Dashboard de KPIs

Indicadores generales (clientes, productos, stock bajo, pedidos pendientes, créditos activos, cuotas vencidas) y un widget de **Ventas del Mes** con el total recaudado siempre visible y un desglose de ventas por producto en un **acordeón desplegable**.

### 💳 Sistema de Créditos

- Wizard de 4 pasos (Cliente → Producto → Configurar Pago → Confirmación) que genera automáticamente las cuotas según cantidad y frecuencia (semanal/mensual), con fechas de vencimiento calculadas.
- Financiación accesible "con solo DNI" como propuesta de valor del negocio, destacada en el catálogo público.
- Vista de detalle con resumen del crédito (cliente, producto, saldo pendiente destacado) y tabla de cuotas con estados semánticos (pagada / pendiente / vencida) y registro de pagos.
- Anulación transaccional de créditos (bloqueada si ya tienen pagos registrados), con reversión de cuotas y cuenta corriente asociada.
- **Historial crediticio del cliente**: al liquidar un crédito por completo, se actualiza automáticamente a "Bueno"/"Excelente" y se muestra como badge "Cliente Cumplidor" en la lista y ficha del cliente.

### 📲 Cobranzas por WhatsApp

- Cron diario (09:00) que recorre cuotas por vencer (hoy/mañana) o vencidas sin recordatorio reciente, y envía un mensaje dinámico por WhatsApp con los datos del cliente y el link de pago, registrando la fecha del último recordatorio para evitar spam.
- Envío manual e inmediato de recordatorio por cuota desde la tabla de detalle del crédito, con feedback visual de éxito/error.

### 📦 Gestión de Stock

Identificación de productos por código de barras (pistola láser por emulación de teclado, o cámara web vía `html5-qrcode`) y registro de movimientos de inventario (ingreso/egreso/ajuste), con historial de movimientos recientes.

### 🛒 Catálogo Público

Storefront en Angular con SSR, sincronizado en tiempo real con el stock del backend, imágenes de producto reales (con placeholder holográfico para los que aún no tienen foto), carrito de compras y checkout integrado con MercadoPago. Diseño 100% responsivo: header con búsqueda adaptable, hero y grillas mobile-first, formularios a ancho completo en pantallas chicas.

## Arquitectura y Patrones del Proyecto

Reglas que se siguen de forma estricta en todo el código — tenerlas en cuenta antes de proponer cambios:

- **Backend — capas separadas:** `routes/` → `controllers/` → `services/` → `repositories/`. Los controllers no acceden a la base de datos directamente; la lógica de negocio vive en `services/`, y las queries SQL en `repositories/` (o `models/` para los recursos más simples, como productos).
- **Angular — reactividad de formularios:** está prohibido leer `.value` de un `FormControl` dentro de un `computed()` (nunca se re-evalúa). Usar siempre `toSignal(control.valueChanges, { initialValue: ... })`.
- **Estilos — sistema "Dark Tech":** variables CSS propias (`--void`, `--slate`, `--signal`, `--white`, `--ash`, `--pulse`, `--border-dim`, `--radius-*` en `frontend/src/styles.css`). **Prohibido usar Tailwind CSS** en cualquier parte del proyecto.

## Cómo levantar el entorno (desarrollo)

### Requisitos previos

- Node.js 20 LTS o superior + npm
- MySQL 8

### 1. Backend (puerto 3000)

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

Usuario admin de prueba tras el seed: **`admin` / `admin123`**.

Correr los tests de integración:

```bash
npm test
```

### 2. Frontend (puerto 4200)

```bash
cd frontend
npm install
npm start        # levanta el panel admin + catálogo público en http://localhost:4200
```

Para el catálogo público con SSR ya buildeado:

```bash
npm run build
npm run serve:ssr:frontend
```

### 3. Probar desde el celular en la misma red Wi-Fi (LAN)

```bash
npm run serve:lan
```

Expone el servidor de desarrollo en todas las interfaces de red (no solo `localhost`), para poder abrir la app desde el navegador de un celular u otro dispositivo conectado a la misma red — útil para probar el diseño responsivo en un dispositivo real. Al arrancar, la terminal muestra la URL de red (ej. `http://192.168.0.238:4200`) para abrir desde el otro dispositivo. El backend no necesita ningún cambio: ya escucha en todas las interfaces por defecto.

## Estructura del repositorio

```text
backend/
  migrations/          # SQL versionado, aplicado automáticamente al arrancar
  uploads/productos/   # Imágenes de producto subidas (no versionado en git)
  src/
    controllers/        # Lógica de request/response por recurso
    services/            # Reglas de negocio (créditos, notificaciones, cron)
    repositories/        # Acceso a datos (queries SQL)
    routes/               # Definición de endpoints /api/*
    middleware/           # Autenticación, validaciones, subida de imágenes
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
|`/productos`|Catálogo, inventario y subida de imágenes|
|`/pedidos`|Pedidos y pasarela de pago (MercadoPago)|
|`/creditos`|Créditos, cuotas, anulación|
|`/cuotas`|Registro de pago y envío manual de recordatorio|
|`/stock`|Movimientos e identificación de productos|
|`/whatsapp`|Envío de notificaciones|
|`/dashboard`|KPIs y desglose de ventas del mes|
|`/publico`|Catálogo público (sin autenticación)|

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
