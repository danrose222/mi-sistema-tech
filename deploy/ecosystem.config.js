// Arranca backend + frontend SSR con un solo comando de PM2, corriendo desde
// la raíz del repo en el VPS: `pm2 start deploy/ecosystem.config.js`.
// Antes de esto: `backend/.env` debe existir (copiado de .env.production.example
// y completado), y `frontend` debe tener el build de producción ya generado
// (`npm run build -- --configuration production`).
module.exports = {
  apps: [
    {
      name: 'cel-shop-backend',
      cwd: './backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M'
    },
    {
      name: 'cel-shop-frontend',
      cwd: './frontend',
      script: 'dist/frontend/server/server.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        // URL interna del backend (no el dominio público) — la usa el SSR
        // para generar /sitemap.xml. Ver frontend/src/server.ts.
        BACKEND_URL: 'http://localhost:3000'
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M'
    }
  ]
};
