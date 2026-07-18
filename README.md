# Cel Shop Center - ERP & POS System

Sistema de gestión operativa y e-commerce a medida para un negocio de tecnología (venta de celulares, accesorios y financiación propia), pensado para reemplazar cuadernos y planillas sueltas por un flujo único: clientes, ventas de mostrador, ventas a crédito, cobranzas, stock y catálogo web — todo en un software propio, sin licencias de terceros.

Es un monorepo con una API backend (Node.js + Express + MySQL) y dos frentes Angular servidos desde el mismo proyecto: un **panel administrativo** (SPA) con los módulos de gestión, y un **catálogo público** (SSR, mobile-first, optimizado para SEO) donde los clientes compran online.

## Módulos

| Módulo | Qué resuelve |
| --- | --- |
| **Caja (POS)** | Venta de mostrador con lector de código de barras, pagos mixtos (efectivo + tarjeta + transferencia), venta a crédito con generación automática de cuotas, y control obligatorio de IMEI/N° de serie para la venta de celulares. |
| **Inventario** | Alta y edición de productos con imágenes, control de stock con historial de movimientos, generación de códigos de barras internos e impresión de etiquetas adhesivas. |
| **Créditos** | Financiación propia "con solo DNI": wizard de otorgamiento, cronograma de cuotas semanal/mensual, registro de pagos, cuenta corriente por cliente y aviso automático por WhatsApp cuando se acredita un pago. |
| **Clientes (CRM)** | Base de clientes unificada entre la venta online y la de mostrador (por DNI), con buscador rápido y alerta de estado crediticio en los puntos donde se necesita — Caja, Créditos y Presupuestos. |
| **Cobranzas** | Cron diario que revisa cuotas por vencer o vencidas y envía recordatorios de pago por WhatsApp, con envío manual también disponible desde el detalle del crédito. |
| **Catálogo público** | Storefront con SSR, sincronizado en tiempo real con el stock del panel, carrito y checkout con MercadoPago, transferencia o efectivo en local. |

## Stack Tecnológico

### Backend

- Node.js + Express 5
- MySQL (`mysql2`, pool de conexiones + transacciones para toda operación que mueve stock o dinero)
- Migraciones SQL versionadas y auto-aplicadas al arrancar (`backend/migrations/`)
- JWT + bcrypt para autenticación del panel admin
- `multer` para la subida de imágenes de productos
- `express-validator`, `express-rate-limit`, `helmet` y CORS restrictivo
- `node-cron` para tareas programadas (cobranzas, marcado de cuotas vencidas, liberación de reservas)
- Integraciones: **MercadoPago** (pagos), **WhatsApp Business API** (notificaciones) y SMTP genérico (comprobantes por email)
- Jest + Supertest para tests de integración

### Frontend

- Angular 21 — Standalone Components, Signals (`signal`, `computed`, `toSignal`), control flow nativo (`@if`/`@for`)
- Angular Material (tablas, diálogos, stepper, selects)
- SSR para el catálogo público
- `jsbarcode` para la generación de códigos de barra (etiquetas de producto)
- CSS propio con sistema de diseño "Dark Tech" (variables CSS en `frontend/src/styles.css`), sin frameworks de utilidades
- Playwright para tests end-to-end

## Arquitectura y Patrones del Proyecto

- **Backend — capas separadas:** `routes/` → `controllers/` → `services/` → `repositories/`. Los controllers no acceden a la base de datos directamente; la lógica de negocio vive en `services/`, y las queries SQL en `repositories/` (o `models/` para los recursos más simples).
- **Angular — reactividad de formularios:** no se lee `.value` de un `FormControl` dentro de un `computed()`. Se usa `toSignal(control.valueChanges, { initialValue: ... })`.
- **Estilos:** sistema "Dark Tech" con variables CSS propias (`--void`, `--slate`, `--signal`, `--white`, `--ash`, `--pulse`, `--border-dim`, `--radius-*`).

## Requisitos previos

- Node.js 20 LTS o superior + npm
- MySQL 8
- Una cuenta de MercadoPago (credenciales de producción) si se va a cobrar online
- Un número de WhatsApp Business API y SMTP si se van a usar las notificaciones automáticas

---

## Despliegue en producción

### 1. Obtener el código en el servidor

```bash
git clone <url-del-repositorio>
cd mi-sistema-tech
```

### 2. Backend

```bash
cd backend
npm install --omit=dev
cp .env.production.example .env
```

Completar `.env` con las credenciales reales (base de datos, JWT, MercadoPago, WhatsApp, SMTP y el dominio del sitio). Ver el detalle de cada variable en [`backend/.env.production.example`](backend/.env.production.example).

Crear la base de datos vacía en MySQL (el nombre debe coincidir con `DB_NAME`):

```sql
CREATE DATABASE cel_shop_center_db;
```

Levantar el servidor una primera vez para que aplique las migraciones automáticamente, y dejarlo corriendo con un gestor de procesos:

```bash
pm2 start src/server.js --name cel-shop-backend
```

Si el servidor vino de un período de pruebas y hay que arrancar con los datos en cero (manteniendo el usuario administrador), correr:

```bash
npm run db:clean
```

### 3. Frontend

```bash
cd frontend
npm install
npm run build -- --configuration production
```

Esto genera `dist/frontend/browser` (assets estáticos del panel admin y del catálogo, servidos por Nginx) y `dist/frontend/server` (bundle SSR del catálogo público). Levantar el servidor SSR con el gestor de procesos:

```bash
pm2 start dist/frontend/server/server.mjs --name cel-shop-frontend
```

### 4. Reverse proxy

Un Nginx (u otro reverse proxy) delante de ambos procesos, enrutando:

- `/api/*` y `/uploads/*` → backend (puerto `3000`)
- el resto → proceso SSR del frontend (puerto por defecto `4000`)

con certificado TLS sobre el dominio configurado en `FRONTEND_URL`.

---

## Entorno de desarrollo

### 1. Backend (puerto 3000)

```bash
cd backend
npm install
cp .env.example .env   # completar DB_*, JWT_SECRET, MP_ACCESS_TOKEN_TEST, WHATSAPP_*, etc.
npm run dev             # aplica las migraciones automáticamente al arrancar
npm run seed             # datos de prueba (clientes, productos, créditos, usuarios)
npm test                  # tests de integración
```

Usuario admin de prueba tras el seed: `admin` / `admin123`.

### 2. Frontend (puerto 4200)

```bash
cd frontend
npm install
npm start        # panel admin + catálogo público en http://localhost:4200
```

Para probar el diseño responsivo desde un celular en la misma red Wi-Fi:

```bash
npm run serve:lan
```

## Estructura del repositorio

```text
backend/
  migrations/          # SQL versionado, aplicado automáticamente al arrancar
  scripts/              # seed.js (datos de prueba) y cleanDb.js (reset a producción)
  uploads/productos/   # Imágenes de producto subidas (no versionado en git)
  src/
    controllers/        # Lógica de request/response por recurso
    services/            # Reglas de negocio (créditos, notificaciones, cron)
    repositories/        # Acceso a datos (queries SQL)
    routes/               # Definición de endpoints /api/*
    middleware/           # Autenticación, validaciones, subida de imágenes

frontend/
  src/app/
    pages/               # Vistas: dashboard, clientes, productos, pedidos, créditos, caja, stock, público
    components/           # Componentes reutilizables (layout, scanner de barras, etc.)
    services/              # Clientes HTTP por recurso
    interceptors/           # Inyección de JWT + manejo de 401
```

## API — endpoints principales (`/api`)

| Recurso | Descripción |
| --- | --- |
| `/auth` | Login y emisión de tokens JWT |
| `/clientes` | CRUD de clientes, búsqueda por DNI y estado crediticio |
| `/productos` | Catálogo, inventario y subida de imágenes |
| `/pedidos` | Pedidos (web y POS), pasarela de pago, devoluciones |
| `/creditos` | Créditos, cuotas, anulación |
| `/cuotas` | Registro de pago y envío manual de recordatorio |
| `/stock` | Movimientos e identificación de productos |
| `/reportes` | Caja diaria y reportes operativos |
| `/whatsapp` | Envío de notificaciones |
| `/dashboard` | KPIs y desglose de ventas del mes |
| `/publico` | Catálogo público (sin autenticación) |

## Variables de entorno

- Desarrollo: [`backend/.env.example`](backend/.env.example)
- Producción: [`backend/.env.production.example`](backend/.env.production.example)

Todas las credenciales (base de datos, JWT, MercadoPago, WhatsApp, SMTP) se leen exclusivamente de variables de entorno — ninguna queda hardcodeada en el código fuente.

## Scripts disponibles (backend)

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga automática (desarrollo) |
| `npm start` | Servidor en modo producción |
| `npm test` | Suite de tests de integración |
| `npm run seed` | Carga datos de prueba |
| `npm run db:clean` | Vacía ventas/stock/créditos/clientes y preserva (o regenera) el administrador principal |
