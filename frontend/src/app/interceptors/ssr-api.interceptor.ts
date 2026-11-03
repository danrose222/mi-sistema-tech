import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

/**
 * URL interna del backend para las llamadas que se hacen durante el SSR.
 * Solo se provee en app.config.server.ts; en el navegador queda en null y el
 * interceptor no hace nada.
 */
export const SSR_BACKEND_URL = new InjectionToken<string | null>('SSR_BACKEND_URL', {
  providedIn: 'root',
  factory: () => null
});

/**
 * En el servidor, una URL relativa como `/api/publico/productos` se resolvería
 * contra el dominio público: el pedido saldría del VPS y volvería a entrar por
 * nginx. Se reescribe a la URL interna del backend para evitar ese rodeo y para
 * que el rate limiter lo reconozca como tráfico local del SSR.
 * La caché de transferencia SSR → navegador sigue funcionando porque Angular la
 * resuelve antes de los interceptores, con la URL original.
 */
export const ssrApiInterceptor: HttpInterceptorFn = (req, next) => {
  const backendUrl = inject(SSR_BACKEND_URL);
  if (!backendUrl || !req.url.startsWith('/api/')) {
    return next(req);
  }
  return next(req.clone({ url: `${backendUrl}${req.url}` }));
};
