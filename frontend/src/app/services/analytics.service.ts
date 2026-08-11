import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// TODO: reemplazar por el Measurement ID real (formato G-XXXXXXXXXX) al crear
// la propiedad en Google Analytics. Mientras empiece con "G-XXXX" el script
// no se inyecta, así que es seguro dejarlo así en desarrollo.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

const CONSENT_KEY = 'cookie_consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private cargado = false;

  /** Se llama al iniciar la app: si el visitante ya había aceptado cookies en una visita anterior, retoma la carga sin volver a mostrar el banner. */
  cargarSiHayConsentimientoPrevio(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (localStorage.getItem(CONSENT_KEY) === 'aceptado') this.cargarGtag();
  }

  obtenerConsentimientoGuardado(): 'aceptado' | 'rechazado' | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(CONSENT_KEY) as 'aceptado' | 'rechazado' | null;
  }

  otorgarConsentimiento(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(CONSENT_KEY, 'aceptado');
    this.cargarGtag();
  }

  rechazarConsentimiento(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(CONSENT_KEY, 'rechazado');
  }

  private cargarGtag(): void {
    if (this.cargado || GA_MEASUREMENT_ID.startsWith('G-XXXX')) return;
    this.cargado = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer!.push(args);
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  }
}
