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
    <div class="public-container">
      
      <!-- HEADER -->
      <mat-toolbar color="primary" class="navbar mat-elevation-z4">
        <div class="nav-content">
          <div class="logo-section" routerLink="/">
            <mat-icon class="logo-icon">phone_iphone</mat-icon>
            <span class="brand-name">CEL SHOP CENTER</span>
          </div>

          <div class="search-bar hidden-mobile">
            <input type="text" placeholder="Buscar productos..." (keyup.enter)="buscar($event)">
            <mat-icon>search</mat-icon>
          </div>

          <div class="actions">
            <button mat-button routerLink="/productos" class="hidden-mobile">Catálogo</button>
            <button mat-icon-button routerLink="/carrito" aria-label="Ver carrito">
              <mat-icon [matBadge]="carritoService.totalItems()" matBadgeColor="warn" [matBadgeHidden]="carritoService.totalItems() === 0">shopping_cart</mat-icon>
            </button>
            <!-- Menú hamburguesa para mobile -->
            <button mat-icon-button [matMenuTriggerFor]="menu" class="mobile-only" aria-label="Menú">
              <mat-icon>menu</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item routerLink="/productos">Catálogo</button>
              <button mat-menu-item routerLink="/admin/dashboard">Administración</button>
            </mat-menu>
          </div>
        </div>
      </mat-toolbar>

      <!-- BUSCADOR MOBILE -->
      <div class="mobile-search mobile-only">
        <input type="text" placeholder="Buscar productos..." (keyup.enter)="buscar($event)">
        <mat-icon>search</mat-icon>
      </div>

      <!-- CONTENIDO PRINCIPAL -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- FOOTER -->
      <footer class="footer">
        <div class="footer-grid">
          <div class="footer-col">
            <h3>CEL SHOP CENTER</h3>
            <p>Tu tienda de tecnología de confianza en Argentina.</p>
          </div>
          <div class="footer-col">
            <h3>Enlaces</h3>
            <ul>
              <li><a routerLink="/">Inicio</a></li>
              <li><a routerLink="/productos">Productos</a></li>
              <li><a routerLink="/admin/login">Acceso Empleados</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3>Contacto</h3>
            <p><mat-icon inline>email</mat-icon> ventas&#64;celshop.com.ar</p>
            <p><mat-icon inline>phone</mat-icon> +54 9 11 1234-5678</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 Cel Shop Center. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .public-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: #f8fafc;
    }

    .navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      height: 70px;
      padding: 0 24px;
    }

    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .logo-icon { font-size: 28px; width: 28px; height: 28px; }
    .brand-name { font-size: 1.4rem; font-weight: 700; letter-spacing: 0.5px; }

    /* Buscador */
    .search-bar {
      position: relative;
      flex: 0 1 500px;
      margin: 0 24px;
    }
    .search-bar input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      border-radius: 20px;
      border: none;
      outline: none;
      background: rgba(255,255,255,0.15);
      color: white;
      font-size: 1rem;
      transition: background 0.3s;
    }
    .search-bar input::placeholder { color: rgba(255,255,255,0.7); }
    .search-bar input:focus { background: rgba(255,255,255,0.25); }
    .search-bar mat-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255,255,255,0.8);
    }

    .mobile-search {
      position: relative;
      padding: 12px 16px;
      background: #0284c7; /* asumiendo theme primary color de material preconfigurado */
    }
    .mobile-search input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      border-radius: 20px;
      border: none;
      outline: none;
      background: rgba(255,255,255,0.9);
      font-size: 1rem;
    }
    .mobile-search mat-icon {
      position: absolute;
      left: 28px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }

    .actions { display: flex; align-items: center; gap: 8px; }

    .main-content {
      flex: 1;
    }

    /* Footer */
    .footer {
      background-color: #1e293b;
      color: #cbd5e1;
      padding-top: 48px;
      margin-top: auto;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 32px;
    }
    .footer-col h3 { color: white; margin-bottom: 16px; font-weight: 600; }
    .footer-col ul { list-style: none; padding: 0; margin: 0; }
    .footer-col ul li { margin-bottom: 8px; }
    .footer-col ul li a { color: #cbd5e1; text-decoration: none; transition: color 0.2s; }
    .footer-col ul li a:hover { color: white; }
    .footer-col p { margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    
    .footer-bottom {
      background-color: #0f172a;
      text-align: center;
      padding: 16px;
      font-size: 0.9rem;
    }
    .footer-bottom p { margin: 0; }

    .mobile-only { display: none; }

    @media (max-width: 768px) {
      .hidden-mobile { display: none !important; }
      .mobile-only { display: block; }
      .nav-content { padding: 0; }
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
