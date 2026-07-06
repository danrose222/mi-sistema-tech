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
    <!-- HERO SECTION -->
    <section class="hero">
      <div class="hero-content">
        <span class="hero-badge">Nuevos Ingresos</span>
        <h1>La Mejor Tecnología <br>al Mejor Precio</h1>
        <p>Descubrí el smartphone perfecto para vos con envío a todo el país y cuotas sin interés.</p>
        <div class="hero-actions">
          <button mat-flat-button color="primary" class="btn-large" routerLink="/productos">Ver Catálogo</button>
          <button mat-stroked-button class="btn-large outline-white" routerLink="/productos" [queryParams]="{categoria: 'celulares'}">Ofertas Celulares</button>
        </div>
      </div>
    </section>

    <!-- CARACTERÍSTICAS -->
    <section class="features container">
      <div class="feature">
        <div class="feat-icon"><mat-icon>local_shipping</mat-icon></div>
        <h3>Envío Gratis</h3>
        <p>En compras superiores a $100.000</p>
      </div>
      <div class="feature">
        <div class="feat-icon"><mat-icon>credit_score</mat-icon></div>
        <h3>Cuotas Sin Interés</h3>
        <p>Con todas las tarjetas de crédito</p>
      </div>
      <div class="feature">
        <div class="feat-icon"><mat-icon>verified</mat-icon></div>
        <h3>Garantía Oficial</h3>
        <p>12 meses en todos nuestros productos</p>
      </div>
    </section>

    <!-- DESTACADOS -->
    <section class="destacados container">
      <div class="section-header">
        <h2>Productos Destacados</h2>
        <a routerLink="/productos" class="view-all">Ver todos <mat-icon inline>arrow_forward</mat-icon></a>
      </div>
      
      <div class="productos-grid">
        @for (prod of destacados(); track prod.id) {
          <app-producto-card [producto]="prod"></app-producto-card>
        } @empty {
          <!-- Skeleton loaders para el parpadeo de carga -->
          <div class="skeleton-card" *ngFor="let i of [1,2,3,4]"></div>
        }
      </div>
    </section>

    <!-- CATEGORÍAS POPULARES -->
    <section class="categorias bg-light">
      <div class="container">
        <div class="section-header center">
          <h2>Categorías Populares</h2>
        </div>
        <div class="cat-grid">
          <mat-card class="cat-card" routerLink="/productos" [queryParams]="{categoria: 'celulares'}">
            <mat-icon>smartphone</mat-icon>
            <h3>Celulares</h3>
          </mat-card>
          <mat-card class="cat-card" routerLink="/productos" [queryParams]="{categoria: 'laptops'}">
            <mat-icon>laptop_mac</mat-icon>
            <h3>Laptops</h3>
          </mat-card>
          <mat-card class="cat-card" routerLink="/productos" [queryParams]="{categoria: 'accesorios'}">
            <mat-icon>headphones</mat-icon>
            <h3>Accesorios</h3>
          </mat-card>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    
    /* Hero */
    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #0284c7 100%);
      color: white;
      padding: 80px 24px;
      text-align: center;
    }
    .hero-content { max-width: 800px; margin: 0 auto; }
    .hero-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .hero h1 { font-size: 3.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 24px; }
    .hero p { font-size: 1.2rem; color: #e0f2fe; margin-bottom: 32px; }
    .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn-large { padding: 8px 32px; font-size: 1.1rem; border-radius: 30px; }
    .outline-white { color: white; border-color: white; }

    /* Features */
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      padding: 64px 24px;
    }
    .feature {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .feat-icon {
      background: #e0f2fe;
      color: #0284c7;
      width: 64px; height: 64px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .feat-icon mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .feature h3 { margin: 0 0 8px 0; font-size: 1.2rem; color: #1e293b; }
    .feature p { margin: 0; color: #64748b; }

    /* Destacados */
    .destacados { padding-bottom: 64px; }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;
    }
    .section-header.center { justify-content: center; margin-bottom: 48px; }
    .section-header h2 { margin: 0; font-size: 2rem; color: #0f172a; font-weight: 700; }
    .view-all { color: #0284c7; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .view-all:hover { text-decoration: underline; }

    .productos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
    }

    .skeleton-card {
      height: 400px;
      background: #f1f5f9;
      border-radius: 12px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }

    /* Categorías */
    .bg-light { background-color: #f1f5f9; padding: 64px 0; }
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
    }
    .cat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e2e8f0;
      box-shadow: none !important;
    }
    .cat-card:hover {
      border-color: #0284c7;
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
    }
    .cat-card mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; color: #0284c7; }
    .cat-card h3 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight: 600; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
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
