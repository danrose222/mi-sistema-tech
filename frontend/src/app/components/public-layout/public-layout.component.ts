import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';

import { CarritoService } from '../../services/carrito.service';
import { CookieConsentComponent } from '../cookie-consent/cookie-consent.component';

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
    MatMenuModule,
    CookieConsentComponent
  ],
  template: `
    <div class="shell">
      
      <!-- NAVBAR -->
      <header class="navbar">
        <div class="navbar-inner">
          <img src="assets/logo.jpeg" alt="Cel Shop Center" class="logo-img logo-blend" routerLink="/">

          <div class="search-wrapper">
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
          <div class="footer-col footer-col--brand">
            <img src="assets/logo.jpeg" alt="Cel Shop Center" class="footer-logo logo-blend">
            <p>Tu tienda de tecnología de confianza en Argentina.</p>
          </div>
          <div class="footer-col">
            <h4>Navegación</h4>
            <ul>
              <li><a routerLink="/">Inicio</a></li>
              <li><a routerLink="/productos">Productos</a></li>
              <li><a routerLink="/productos">Destacados</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a routerLink="/legal/terminos-y-condiciones">Términos y Condiciones</a></li>
              <li><a routerLink="/legal/privacidad">Política de Privacidad</a></li>
              <li><a routerLink="/legal/cookies">Política de Cookies</a></li>
              <li><a routerLink="/legal/arrepentimiento">Botón de Arrepentimiento</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Contacto</h4>
            <p class="footer-financiacion">Financiación en cuotas con solo DNI. Aprobación rápida.</p>
            <div class="contact-item">
              <mat-icon>location_on</mat-icon>
              <span>Dean Funes 463, Capilla del Monte, Córdoba</span>
            </div>
            <div class="contact-item">
              <mat-icon>chat</mat-icon>
              <a href="https://wa.me/5493548547661" target="_blank" rel="noopener">+54 9 3548 54-7661</a>
            </div>
            <div class="contact-item">
              <mat-icon>call</mat-icon>
              <a href="tel:+5493548544757">+54 9 3548 54-4757</a>
            </div>
            <div class="contact-item">
              <mat-icon>mail</mat-icon>
              <a href="mailto:ventas@celshop.com.ar">ventas&#64;celshop.com.ar</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 Cel Shop Center</p>
        </div>
      </footer>

      <app-cookie-consent></app-cookie-consent>
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

    /* El logo original tiene fondo negro sólido: screen trata el negro como
       no-op en la mezcla, así que el cuadrado se funde con el fondo oscuro
       del navbar/footer y solo queda visible el isotipo cian/plateado. */
    .logo-blend {
      mix-blend-mode: screen;
      cursor: pointer;
    }

    /* Search */
    .search-wrapper {
      flex: 1;
      max-width: 480px;
      position: relative;
    }
    .search-wrapper input {
      width: 100%;
      padding: 10px 18px 10px 42px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-dim);
      border-radius: 100px;
      color: var(--white);
      font-size: 0.9rem;
      font-family: var(--font-body);
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
      box-sizing: border-box;
    }
    .search-wrapper input::placeholder { color: var(--ash); }
    .search-wrapper input:focus {
      border-color: var(--signal);
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 0 3px rgba(0, 174, 239, 0.12);
    }
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
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 56px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 64px 24px 48px;
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
    .footer-col--brand { display: flex; flex-direction: column; }
    .footer-logo {
      width: 200px;
      max-width: 100%;
      height: auto;
      display: block;
      margin-bottom: 16px;
    }
    .footer-financiacion {
      color: var(--white);
      font-size: 0.85rem;
      font-weight: 500;
      margin: 0 0 16px 0;
    }
    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--white);
    }
    .contact-item mat-icon {
      color: var(--signal);
      font-size: 19px;
      width: 19px;
      height: 19px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .contact-item a {
      color: var(--white);
      text-decoration: none;
      transition: color 0.15s;
    }
    .contact-item a:hover { color: var(--pulse); }
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
      .footer-inner { grid-template-columns: 1fr; gap: 36px; text-align: center; }
      .footer-col--brand { align-items: center; }
      .footer-logo { margin-left: auto; margin-right: auto; }
      .contact-item { justify-content: center; }

      .navbar { height: auto; }
      .navbar-inner {
        flex-wrap: wrap;
        gap: 12px;
        padding: 10px 16px;
      }
      .search-wrapper {
        order: 3;
        flex-basis: 100%;
        max-width: none;
      }
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
