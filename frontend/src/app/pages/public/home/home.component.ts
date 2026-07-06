import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { PublicApiService } from '../../../services/public-api.service';
import { SeoService } from '../../../services/seo.service';
import { ProductoCardComponent } from '../../../components/producto-card/producto-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule, ProductoCardComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <div class="hero-inner">
        <h1>Encontrá tu próximo<br>celular.</h1>
        <p class="hero-sub">Financiación en cuotas sin interés · Envío gratis a todo el país · Garantía oficial de 12 meses.</p>
        <a routerLink="/productos" class="btn-primary btn-lg">Explorar catálogo</a>
      </div>
    </section>

    <!-- TRUST STRIP -->
    <section class="trust-strip">
      <div class="trust-inner">
        <div class="trust-item">
          <mat-icon>local_shipping</mat-icon>
          <div>
            <strong>Envío gratis</strong>
            <span>En compras +$100.000</span>
          </div>
        </div>
        <div class="trust-item">
          <mat-icon>credit_score</mat-icon>
          <div>
            <strong>Cuotas sin interés</strong>
            <span>Todas las tarjetas</span>
          </div>
        </div>
        <div class="trust-item">
          <mat-icon>verified</mat-icon>
          <div>
            <strong>Garantía oficial</strong>
            <span>12 meses</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURED PRODUCTS -->
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <h2>Productos destacados</h2>
          <a routerLink="/productos" class="see-all">Ver todos <mat-icon inline>arrow_forward</mat-icon></a>
        </div>
        
        <div class="product-grid">
          @for (prod of destacados(); track prod.id) {
            <app-producto-card [producto]="prod"></app-producto-card>
          } @empty {
            <div class="skeleton" *ngFor="let i of [1,2,3,4]"></div>
          }
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="section section--alt">
      <div class="section-inner">
        <div class="section-header section-header--center">
          <h2>Categorías</h2>
        </div>
        <div class="cat-grid">
          <a class="cat-item card" routerLink="/productos" [queryParams]="{categoria: 'celulares'}">
            <mat-icon>smartphone</mat-icon>
            <span>Celulares</span>
          </a>
          <a class="cat-item card" routerLink="/productos" [queryParams]="{categoria: 'laptops'}">
            <mat-icon>laptop_mac</mat-icon>
            <span>Laptops</span>
          </a>
          <a class="cat-item card" routerLink="/productos" [queryParams]="{categoria: 'accesorios'}">
            <mat-icon>headphones</mat-icon>
            <span>Accesorios</span>
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* ── Hero ────────────────────────────── */
    .hero {
      padding: 100px 24px 80px;
      background: 
        radial-gradient(ellipse at 20% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
        var(--void);
    }
    .hero-inner {
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero h1 {
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--white);
      margin: 0 0 20px 0;
    }
    .hero-sub {
      color: var(--ash);
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0 0 36px 0;
      max-width: 520px;
    }
    .btn-lg { padding: 14px 36px; font-size: 1rem; }

    /* ── Trust strip ────────────────────── */
    .trust-strip {
      border-bottom: 1px solid var(--border-dim);
    }
    .trust-inner {
      display: flex;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .trust-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 24px 0;
    }
    .trust-item:not(:last-child) {
      border-right: 1px solid var(--border-dim);
      padding-right: 32px;
      margin-right: 32px;
    }
    .trust-item mat-icon {
      color: var(--signal);
      font-size: 28px;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .trust-item strong {
      display: block;
      color: var(--white);
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .trust-item span {
      color: var(--ash);
      font-size: 0.82rem;
    }

    /* ── Sections ────────────────────────── */
    .section {
      padding: 72px 0;
    }
    .section--alt {
      background-color: var(--slate);
      border-top: 1px solid var(--border-dim);
    }
    .section-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 36px;
    }
    .section-header--center { justify-content: center; }
    .section-header h2 {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--white);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .see-all {
      color: var(--pulse);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s;
    }
    .see-all:hover { color: var(--signal); }

    /* Product grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
    }

    .skeleton {
      height: 380px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }

    /* Category grid */
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    .cat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 44px 24px;
      cursor: pointer;
      text-decoration: none;
    }
    .cat-item mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--signal);
      margin-bottom: 16px;
    }
    .cat-item span {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--white);
    }

    /* ── Responsive ──────────────────────── */
    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
      .hero { padding: 64px 24px 48px; }
      .trust-inner { flex-direction: column; }
      .trust-item:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid var(--border-dim);
        padding-right: 0;
        margin-right: 0;
        padding-bottom: 16px;
        margin-bottom: 16px;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private api = inject(PublicApiService);
  private seo = inject(SeoService);

  destacados = signal<any[]>([]);

  ngOnInit() {
    this.seo.setSeoData('Inicio', 'CEL SHOP CENTER - Tu tienda de tecnología líder con los mejores precios en celulares, laptops y accesorios.');

    this.api.getProductos(1, 8).subscribe({
      next: (res) => {
        this.destacados.set(res.data || []);
      }
    });
  }
}
