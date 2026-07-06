import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Sidebar de Navegación -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Mi Sistema Tech</h2>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">Dashboard</a>
          <a routerLink="/admin/clientes" routerLinkActive="active" class="nav-item">Clientes</a>
          <a routerLink="/admin/productos" routerLinkActive="active" class="nav-item">Productos</a>
          <a routerLink="/admin/pedidos" routerLinkActive="active" class="nav-item">Pedidos</a>
          <a routerLink="/admin/creditos" routerLinkActive="active" class="nav-item">Créditos</a>
        </nav>
      </aside>

      <!-- Contenedor Principal -->
      <main class="main-content">
        <!-- Header Superior -->
        <header class="headerbar">
          <div class="user-info">
            <span class="greeting">Hola, {{ authService.currentUser()?.nombre }}</span>
            <span class="role-badge">{{ authService.currentUser()?.rol }}</span>
          </div>
          <button (click)="logout()" class="btn-logout">Cerrar Sesión</button>
        </header>

        <!-- Contenido Dinámico según la ruta -->
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background-color: #f8fafc;
      font-family: 'Inter', system-ui, sans-serif;
    }
    
    .sidebar {
      width: 250px;
      background-color: #0f172a;
      color: white;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #1e293b;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #38bdf8;
    }

    .sidebar-nav {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .nav-item {
      padding: 12px 24px;
      color: #94a3b8;
      text-decoration: none;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .nav-item:hover {
      background-color: #1e293b;
      color: white;
    }

    .nav-item.active {
      background-color: #0ea5e9;
      color: white;
      border-right: 4px solid #7dd3fc;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .headerbar {
      height: 64px;
      background-color: white;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end; /* A la derecha por diseño moderno */
      align-items: center;
      padding: 0 32px;
      gap: 24px;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .greeting {
      font-weight: 600;
      color: #334155;
    }

    .role-badge {
      background-color: #e0f2fe;
      color: #0284c7;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-logout {
      background-color: transparent;
      color: #ef4444;
      border: 1px solid #fca5a5;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background-color: #fef2f2;
      border-color: #ef4444;
    }

    .content-area {
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
