import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Bloque de "Envío + Total" reutilizado por Carrito y Checkout: antes cada
// vista tenía su propia copia de estos estilos y se desincronizaron (el
// Carrito quedó con la paleta clara de un diseño viejo, ilegible sobre el
// fondo oscuro del resto del sitio). Con un solo componente, un cambio de
// paleta futuro se aplica a ambas vistas a la vez.
@Component({
  selector: 'app-resumen-totales',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="summary-totals">
      @if (subtotal() !== null) {
        <div class="summary-row">
          <span>{{ labelSubtotal() }}</span>
          <span>{{ subtotal() | currency:'ARS' }}</span>
        </div>
      }
      <div class="summary-row">
        <span>Envío</span>
        @if (costoEnvio() === null) {
          <span class="envio-pendiente">Se calcula en el checkout</span>
        } @else if (costoEnvio() === 0) {
          <span class="free-shipping">Gratis</span>
        } @else {
          <span>{{ costoEnvio() | currency:'ARS' }}</span>
        }
      </div>
      <div class="summary-row total">
        <span>{{ labelTotal() }}</span>
        <span>{{ total() | currency:'ARS' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .summary-totals {
      border-top: 1px solid var(--border-dim);
      padding-top: 24px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      color: var(--ash);
      font-size: 1.1rem;
    }
    .free-shipping { color: var(--success); font-weight: 600; }
    .envio-pendiente { font-size: 0.95rem; }
    .summary-row.total {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--white);
      margin-bottom: 0;
    }
    @media (max-width: 480px) {
      .summary-row.total { font-size: 1.25rem; }
    }
  `]
})
export class ResumenTotalesComponent {
  subtotal = input<number | null>(null);
  labelSubtotal = input('Productos');
  // null = todavía no se eligió método de entrega (ej. en el Carrito), así
  // que no se puede afirmar que el envío sea gratis ni cuánto cuesta.
  costoEnvio = input<number | null>(0);
  total = input(0);
  labelTotal = input('Total');
}
