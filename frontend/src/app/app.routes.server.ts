import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El panel admin vive detrás de auth y el token vive solo en localStorage del browser,
  // que no existe durante el render en el servidor. Si se sirve por SSR, authGuard ve
  // "no logueado" en cada request/reload y rebota a /login (que a su vez rebota de vuelta
  // a /admin/dashboard si el cliente sí tiene token) — el panel nunca respeta la URL pedida.
  // No hay beneficio de SEO en un panel autenticado, así que se sirve 100% client-side.
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
