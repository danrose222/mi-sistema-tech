import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterModule, MatButtonModule],
  template: `
    @if (mostrar()) {
      <div class="cookie-banner" role="dialog" aria-label="Aviso de cookies">
        <p>
          Usamos cookies propias y de análisis para mejorar tu experiencia de compra.
          Podés leer más en nuestra <a routerLink="/legal/cookies">Política de Cookies</a>.
        </p>
        <div class="cookie-actions">
          <button mat-stroked-button (click)="rechazar()">Rechazar</button>
          <button mat-flat-button color="primary" (click)="aceptar()">Aceptar</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 16px;
      z-index: 1000;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      max-width: 900px;
      margin: 0 auto;
      padding: 16px 20px;
      border-radius: 12px;
      background: var(--slate, #1b1f27);
      border: 1px solid var(--border-dim, rgba(255,255,255,0.1));
      color: var(--white, #fff);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    .cookie-banner p {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5;
      flex: 1 1 320px;
    }
    .cookie-banner a { color: var(--signal, #00aeef); }
    .cookie-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  `]
})
export class CookieConsentComponent {
  private analytics = inject(AnalyticsService);
  mostrar = signal(false);

  constructor() {
    afterNextRender(() => {
      const consentimiento = this.analytics.obtenerConsentimientoGuardado();
      if (consentimiento === null) {
        this.mostrar.set(true);
      } else if (consentimiento === 'aceptado') {
        this.analytics.cargarSiHayConsentimientoPrevio();
      }
    });
  }

  aceptar(): void {
    this.analytics.otorgarConsentimiento();
    this.mostrar.set(false);
  }

  rechazar(): void {
    this.analytics.rechazarConsentimiento();
    this.mostrar.set(false);
  }
}
