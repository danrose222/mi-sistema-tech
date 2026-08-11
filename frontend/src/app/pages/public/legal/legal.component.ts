import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SeoService } from '../../../services/seo.service';
import { CONTENIDO_LEGAL, PaginaLegal } from './legal-content';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1>{{ contenido.titulo }}</h1>
        <p class="actualizado">Última actualización: {{ contenido.actualizado }}</p>

        @for (seccion of contenido.secciones; track seccion.titulo) {
          <section class="legal-seccion">
            <h2>{{ seccion.titulo }}</h2>
            @for (parrafo of seccion.parrafos; track parrafo) {
              <p>{{ parrafo }}</p>
            }
          </section>
        }

        @if (esArrepentimiento) {
          <div class="contacto-arrepentimiento">
            <a href="https://wa.me/5493548547661" target="_blank" rel="noopener">WhatsApp: +54 9 3548 54-7661</a>
            <a href="mailto:ventas@celshop.com.ar">ventas&#64;celshop.com.ar</a>
            <a href="tel:+5493548544757">Tel: +54 9 3548 54-4757</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      padding: 48px 24px 80px;
      color: var(--white, #fff);
    }
    .legal-container {
      max-width: 760px;
      margin: 0 auto;
    }
    h1 {
      font-family: var(--font-display);
      margin: 0 0 8px 0;
    }
    .actualizado {
      color: var(--ash, #9aa0aa);
      font-size: 0.85rem;
      margin: 0 0 32px 0;
    }
    .legal-seccion {
      margin-bottom: 28px;
    }
    .legal-seccion h2 {
      font-size: 1.05rem;
      margin: 0 0 10px 0;
    }
    .legal-seccion p {
      line-height: 1.7;
      color: var(--ash, #c8ccd2);
      margin: 0 0 10px 0;
    }
    .contacto-arrepentimiento {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
      padding: 16px 20px;
      border-radius: 10px;
      background: var(--surface-glass, rgba(255,255,255,0.04));
      border: 1px solid var(--border-dim, rgba(255,255,255,0.1));
    }
    .contacto-arrepentimiento a {
      color: var(--signal, #00aeef);
      text-decoration: none;
    }
  `]
})
export class LegalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  contenido: PaginaLegal = CONTENIDO_LEGAL[this.route.snapshot.data['slug']];
  esArrepentimiento = this.route.snapshot.data['slug'] === 'arrepentimiento';

  ngOnInit(): void {
    this.seo.setSeoData(this.contenido.titulo, `${this.contenido.titulo} de Cel Shop Center.`);
  }
}
