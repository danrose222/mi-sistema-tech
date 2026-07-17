import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { BuscadorDniComponent } from '../buscador-dni/buscador-dni.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, BuscadorDniComponent],
  template: `
    <div class="admin-shell">
      @if (sidebarOpen()) {
        <div class="sidebar-backdrop" (click)="closeSidebar()"></div>
      }

      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-brand">
          <img src="assets/logo.jpeg" alt="Cel Shop Center" class="logo-img" style="height: 36px;" routerLink="/admin/dashboard">
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Dashboard</span>
          </a>
          <a routerLink="/admin/clientes" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Clientes</span>
          </a>
          <a routerLink="/admin/productos" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Productos</span>
          </a>
          <a routerLink="/admin/pedidos" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Pedidos</span>
          </a>
          <a routerLink="/admin/stock" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Stock</span>
          </a>
          <a routerLink="/admin/presupuestos" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Presupuestos</span>
          </a>
          <a routerLink="/admin/caja" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Caja</span>
          </a>
          <a routerLink="/admin/creditos" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-label">Créditos</span>
          </a>
        </nav>
      </aside>

      <main class="admin-main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="menu-toggle" (click)="sidebarOpen.set(true)" aria-label="Abrir menú">
              <mat-icon>menu</mat-icon>
            </button>
            <span class="greeting">{{ authService.currentUser()?.nombre }}</span>
            <span class="role">{{ authService.currentUser()?.rol }}</span>
          </div>
          <app-buscador-dni class="topbar-buscador"></app-buscador-dni>
          <button (click)="logout()" class="btn-danger">Cerrar sesión</button>
        </header>

        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      height: 100vh;
      background-color: var(--void);
      color: var(--white);
      font-family: var(--font-body);
    }

    /* ── Sidebar ─────────────────────── */
    .sidebar {
      width: 240px;
      background-color: var(--slate);
      border-right: 1px solid var(--border-dim);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-brand {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-dim);
    }
    .sidebar-nav {
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: block;
      padding: 11px 16px;
      color: var(--ash);
      text-decoration: none;
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      color: var(--white);
      background-color: rgba(255,255,255,0.04);
    }
    .nav-item.active {
      color: var(--signal);
      background-color: rgba(0, 174, 239, 0.1);
      font-weight: 600;
    }

    .sidebar-backdrop { display: none; }
    .menu-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--white);
      cursor: pointer;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }
    .menu-toggle:hover { background-color: rgba(255, 255, 255, 0.06); }

    /* ── Main area ───────────────────── */
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      height: 64px;
      padding: 0 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-dim);
      background: var(--slate);
      flex-shrink: 0;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .greeting {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .role {
      background-color: rgba(0, 174, 239, 0.1);
      color: var(--pulse);
      border: 1px solid var(--border-dim);
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .admin-content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .menu-toggle { display: flex; }

      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }
      .sidebar.open {
        transform: translateX(0);
      }

      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 150;
      }

      .topbar { padding: 0 16px; }
      .greeting { display: none; }
      .topbar-buscador { display: none; }
      .admin-content { padding: 16px; }
    }
  `]
})
export class LayoutComponent {
  authService = inject(AuthService);
  router = inject(Router);

  sidebarOpen = signal(false);

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
