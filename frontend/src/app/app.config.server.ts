import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SSR_BACKEND_URL } from './interceptors/ssr-api.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Misma variable que usa server.ts para el sitemap (ver deploy/ecosystem.config.js).
    // Sin definir (ej. `ng serve` en desarrollo) no se reescribe nada y las
    // URLs relativas siguen pasando por el proxy del dev server.
    { provide: SSR_BACKEND_URL, useValue: process.env['BACKEND_URL'] || null }
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
