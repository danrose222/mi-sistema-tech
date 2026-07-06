# Guía de Pruebas - Sistema de Gestión

## Pruebas E2E (Frontend)

Las pruebas E2E (end-to-end) verifican el flujo completo del usuario desde la interfaz.

### Instalación

```bash
cd frontend
npm install -D @playwright/test
```

### Ejecución

```bash
# Modo headless (sin interfaz gráfica)
npm run test:e2e

# Con interfaz gráfica (recomendado para desarrollo)
npm run test:e2e:ui

# Modo debug (paso a paso)
npm run test:e2e:debug
```

### Qué se prueba

- **Authentication**: Login, register, logout
- **Products Management**: Crear, listar, borrar productos
- **Stock Management**: Acceso al gestor de stock
- **Admin Navigation**: Navegación entre páginas admin
- **Paginación**: Validar paginación de productos

### Requisitos

- Frontend debe estar corriendo en `http://localhost:39745`
- Backend debe estar corriendo en `http://localhost:3000`

---

## Pruebas de Integración (Backend)

Las pruebas de integración validan los endpoints de la API sin dependencias externas.

### Instalación

```bash
cd backend
npm install -D jest supertest
```

### Ejecución

```bash
# Ejecutar tests una vez
npm test

# Modo watch (reejecutar automáticamente)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

### Qué se prueba

- **Authentication**: Register, login con validación de credenciales
- **Products**: CRUD completo (crear, listar, obtener, borrar)
- **Stock**: Endpoints de movimientos
- **Flujos Integrados**: Caso de uso completo (register → login → crear producto → listar)

### Características

- 12 tests en total
- 100% de cobertura en endpoints
- Tests independientes (sin dependencias de BD real)

---

## Configuración CI/CD

Para ejecutar tests en pipeline:

```bash
# Frontend
cd frontend
npm run test:e2e

# Backend
cd backend
npm test
```

---

## Mejoras Futuras
- [x] Tests unitarios adicionales en Angular components
  - Se agregó un test para `AdminPanelComponent` en `frontend/src/app/components/admin-panel.component.spec.ts`.
- [ ] Tests para servicio MercadoPago
- [x] Tests para servicio WhatsApp
  - Se agregaron tests de integración para el endpoint de notificaciones en `backend/tests/whatsapp.test.js`.
- [ ] Coverage > 80% en todo el código
- [ ] Performance tests (Lighthouse)
