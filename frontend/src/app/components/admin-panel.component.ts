import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h1>Panel de Administración</h1>
      <p>Acciones administrativas:</p>
      <ul>
        <li><button (click)="goProductos()">Gestionar Productos</button></li>
        <li><button (click)="goUsuarios()">Gestionar Usuarios</button></li>
        <li><button (click)="goPedidos()">Ver Pedidos</button></li>
      </ul>
    </section>
  `
})
export class AdminPanelComponent {
  constructor(private router: Router) {}

  goProductos() {
    this.router.navigate(['/admin/productos']);
  }

  goUsuarios() {
    this.router.navigate(['/admin/usuarios']);
  }

  goPedidos() {
    this.router.navigate(['/admin/pedidos']);
  }
}
