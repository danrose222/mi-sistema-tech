import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// nginx (deploy/nginx/celshopcenter.conf) siempre define X-Forwarded-For y
// X-Forwarded-Proto. Si Angular recibe un X-Forwarded-* no confiable, lo
// descarta y renderiza solo en el cliente (sin SEO). Se confía únicamente en
// esos dos porque nginx los pisa; X-Forwarded-Host (que nginx no define y un
// cliente podría inventar) sigue sin ser confiable.
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: ['x-forwarded-for', 'x-forwarded-proto'],
});

// El sitemap se genera en el backend (tiene acceso directo a los productos activos);
// acá solo se hace de passthrough para que quede servido en la raíz del dominio,
// que es donde Google Search Console y robots.txt lo esperan.
const backendUrl = process.env['BACKEND_URL'] || 'http://localhost:3000';

app.get('/sitemap.xml', async (req, res) => {
  try {
    const response = await fetch(`${backendUrl}/api/publico/sitemap.xml`);
    const xml = await response.text();
    res.type('application/xml').send(xml);
  } catch {
    res.status(502).send('Sitemap no disponible');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
