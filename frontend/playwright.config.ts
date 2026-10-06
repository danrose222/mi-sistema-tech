import { defineConfig, devices } from '@playwright/test';

/**
 * Tests E2E del panel admin y del catálogo público.
 *
 * Levanta su propio entorno aislado en puertos distintos a los de desarrollo
 * (backend 3100, frontend 4300) contra una base descartable
 * `<DB_NAME>_e2e` que se recrea y se carga con el seed en cada corrida, así
 * que los tests nunca tocan la base de desarrollo y siempre arrancan del
 * mismo estado. Las credenciales de MySQL se toman de backend/.env.
 *
 * Uso: `npm run e2e` (o `npm run e2e -- --ui` para el modo interactivo).
 */
const BACKEND_PORT = 3100;
const FRONTEND_PORT = 4300;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

const backendEnv = {
  DB_NAME: process.env.E2E_DB_NAME || 'cel_shop_center_db_e2e',
  PORT: String(BACKEND_PORT),
  ALLOWED_ORIGINS: FRONTEND_URL,
  FRONTEND_URL,
  // Vacías a propósito: dotenv no pisa variables ya definidas, así que esto
  // garantiza que ningún test pueda mandar un WhatsApp, un email o generar
  // un cobro real aunque el .env local tenga credenciales cargadas.
  WHATSAPP_TOKEN: '',
  WHATSAPP_API_URL: '',
  MP_ACCESS_TOKEN: '',
  SMTP_HOST: '',
  ANDREANI_USUARIO: ''
};

export default defineConfig({
  testDir: './e2e',
  // Los tests comparten la misma base (ej. la venta en Caja descuenta stock),
  // así que corren en serie para que las aserciones sean deterministas.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // ng serve optimiza dependencias la primera vez que se abre una ruta y
  // recarga la página, lo que puede cortar un test en una corrida en frío.
  // Un reintento lo absorbe; si pasa, Playwright lo reporta como "flaky".
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'node scripts/prepareE2eDb.js && node src/server.js',
      cwd: '../backend',
      url: `http://localhost:${BACKEND_PORT}/api/publico/productos`,
      env: backendEnv,
      // Nunca reutilizar: la base se tiene que recrear en cada corrida.
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: `npx ng serve --port ${FRONTEND_PORT} --proxy-config proxy.e2e.conf.json`,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 180_000
    }
  ]
});
