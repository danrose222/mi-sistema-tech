import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../services/order.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h2>Pedidos</h2>
      <ul>
        <li *ngFor="let p of pedidos">
          Pedido #{{p.id}} — {{p.estado}} — {{p.total}} <button (click)="ver(p.id)">Ver</button>
        </li>
      </ul>
      <div *ngIf="detalle">Detalle: {{ detalle | json }}</div>
    </section>
  `
})
export class AdminOrdersComponent {
  pedidos: any[] = [];
  detalle: any = null;

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const token = AuthService.getToken();
    try {
      this.pedidos = await OrderService.list(token);
    } catch (err) {
      alert('Error cargando pedidos');
    }
  }

  async ver(id: number) {
    const token = AuthService.getToken();
    try {
      this.detalle = await OrderService.get(id, token);
    } catch (err) {
      alert('Error cargando pedido');
    }
  }
}
