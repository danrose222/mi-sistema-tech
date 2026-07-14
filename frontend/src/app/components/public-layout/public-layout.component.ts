import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';

import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule
  ],
  template: `
    <div class="shell">
      
      <!-- NAVBAR -->
      <header class="navbar">
        <div class="navbar-inner">
          <img src="assets/logo.jpeg" alt="Cel Shop Center" class="logo-img" routerLink="/">

          <div class="search-wrapper hidden-mobile">
            <mat-icon class="search-icon">search</mat-icon>
            <input 
              type="text" 
              placeholder="Buscar celulares, laptops, accesorios..." 
              (keyup.enter)="buscar($event)"
            >
          </div>

          <nav class="nav-actions">
            <a routerLink="/productos" class="nav-link hidden-mobile">Catálogo</a>
            <button mat-icon-button routerLink="/carrito" aria-label="Ver carrito" class="cart-btn">
              <mat-icon [matBadge]="carritoService.totalItems()" matBadgeColor="warn" [matBadgeHidden]="carritoService.totalItems() === 0">shopping_cart</mat-icon>
            </button>
            <button mat-icon-button [matMenuTriggerFor]="menu" class="mobile-only" aria-label="Menú">
              <mat-icon>menu</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item routerLink="/productos">Catálogo</button>
              <button mat-menu-item routerLink="/login">Administración</button>
            </mat-menu>
          </nav>
        </div>
      </header>

      <!-- CONTENT -->
      <main class="main">
        <router-outlet></router-outlet>
      </main>

      <!-- FOOTER -->
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-col">
            <img src="assets/logo.jpeg" alt="Cel Shop Center" class="logo-img" style="height: 32px; margin-bottom: 12px;">
            <p>Tu tienda de tecnología de confianza en Argentina.</p>
          </div>
          <div class="footer-col">
            <h4>Navegación</h4>
            <ul>
              <li><a routerLink="/">Inicio</a></li>
              <li><a routerLink="/productos">Productos</a></li>
              <li><a routerLink="/login">Acceso empleados</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Contacto</h4>
            <p>ventas&#64;celshop.com.ar</p>
            <p>+54 9 11 1234-5678</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 Cel Shop Center</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .shell {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--void);
    }
    /* Marca de agua del logo detrás de todo el storefront: sutil, no compite con el contenido */
    .shell::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -1;
      background-image: url('/assets/logo.jpeg');
      background-size: 900px;
      background-position: center 15%;
      background-repeat: no-repeat;
      opacity: 0.035;
      pointer-events: none;
    }

    /* ── Navbar ─────────────────────────── */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 64px;
      background: var(--surface-glass);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-dim);
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
      height: 100%;
    }

    /* Search */
    .search-wrapper {
      flex: 1;
      max-width: 480px;
      position: relative;
    }
    .search-wrapper input {
      width: 100%;
      padding: 9px 16px 9px 40px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      color: var(--white);
      font-size: 0.9rem;
      font-family: var(--font-body);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .search-wrapper input::placeholder { color: var(--ash); }
    .search-wrapper input:focus { border-color: var(--signal); }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ash);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Nav actions */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }
    .nav-link {
      color: var(--ash);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      transition: color 0.15s;
    }
    .nav-link:hover { color: var(--white); }
    .cart-btn { color: var(--white) !important; }

    /* Main */
    .main { flex: 1; }

    /* ── Footer ─────────────────────────── */
    .footer {
      background-color: var(--slate);
      color: var(--ash);
      margin-top: auto;
      border-top: 1px solid var(--border-dim);
    }
    .footer-inner {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 48px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 56px 24px 40px;
    }
    .footer-col h4 {
      color: var(--white);
      font-family: var(--font-display);
      font-weight: 600;
      margin: 0 0 16px 0;
      font-size: 0.95rem;
    }
    .footer-col p {
      margin: 0 0 8px 0;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .footer-col ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .footer-col ul li { margin-bottom: 8px; }
    .footer-col ul li a {
      color: var(--ash);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.15s;
    }
    .footer-col ul li a:hover { color: var(--pulse); }

    .footer-bottom {
      border-top: 1px solid var(--border-dim);
      text-align: center;
      padding: 20px;
      font-size: 0.85rem;
    }
    .footer-bottom p { margin: 0; }

    /* ── Responsive ─────────────────────── */
    .mobile-only { display: none !important; }
    @media (max-width: 768px) {
      .hidden-mobile { display: none !important; }
      .mobile-only { display: inline-flex !important; }
      .footer-inner { grid-template-columns: 1fr; gap: 32px; }
    }
  `]
})
export class PublicLayoutComponent {
  carritoService = inject(CarritoService);
  private router = inject(Router);

  buscar(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    if (query.trim()) {
      this.router.navigate(['/productos'], { queryParams: { search: query } });
    }
  }
}
