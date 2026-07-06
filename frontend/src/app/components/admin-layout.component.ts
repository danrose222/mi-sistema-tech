import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-layout">
      <nav class="admin-nav">
        <h3>CEL SHOP CENTER</h3>
        <ul>
          <li><a routerLink="/admin">Inicio</a></li>
          <li><a routerLink="/admin/productos">Productos</a></li>
          <li><a routerLink="/admin/usuarios">Usuarios</a></li>
          <li><a routerLink="/admin/pedidos">Pedidos</a></li>
        </ul>
        <div class="logout-btn">
          <button class="btn-primary" (click)="logout()">Cerrar sesión</button>
        </div>
      </nav>
      <main class="admin-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  logout() {
    AuthService.logout();
    window.location.href = '/login';
  }
}
