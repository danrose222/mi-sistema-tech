import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img src="assets/logo.jpeg" alt="Cel Shop Center" class="logo-img" style="height: 36px;" routerLink="/admin/dashboard">
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Dashboard</span>
          </a>
          <a routerLink="/admin/clientes" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Clientes</span>
          </a>
          <a routerLink="/admin/productos" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Productos</span>
          </a>
          <a routerLink="/admin/pedidos" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Pedidos</span>
          </a>
          <a routerLink="/admin/stock" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Stock</span>
          </a>
          <a routerLink="/admin/creditos" routerLinkActive="active" class="nav-item">
            <span class="nav-label">Créditos</span>
          </a>
        </nav>
      </aside>

      <main class="admin-main">
        <header class="topbar">
          <div class="topbar-left">
            <span class="greeting">{{ authService.currentUser()?.nombre }}</span>
            <span class="role">{{ authService.currentUser()?.rol }}</span>
          </div>
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
  `]
})
export class LayoutComponent {
  authService = inject(AuthService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
