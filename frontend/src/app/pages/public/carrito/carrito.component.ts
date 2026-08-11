import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { CarritoService, ItemCarrito } from '../../../services/carrito.service';
import { ResumenTotalesComponent } from '../../../components/resumen-totales/resumen-totales.component';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule, ResumenTotalesComponent],
  template: `
    <div class="page-container">
      <h1 class="page-title">Mi Carrito</h1>

      @if (carrito.items().length === 0) {
        <div class="empty-state">
          <mat-icon>shopping_cart</mat-icon>
          <h2>Tu carrito está vacío</h2>
          <p>¡Explorá nuestro catálogo y encontrá lo que buscás!</p>
          <button mat-flat-button color="primary" class="btn-catalogo" routerLink="/productos">Ir al catálogo</button>
        </div>
      } @else {
        <div class="cart-layout">
          
          <div class="cart-items">
            @for (item of carrito.items(); track item.id) {
              <mat-card class="cart-item mat-elevation-z1">
                <div class="item-img" [routerLink]="['/producto', item.slug]">
                  <img [src]="item.imagen" [alt]="item.nombre">
                </div>
                
                <div class="item-details">
                  <h3 [routerLink]="['/producto', item.slug]">{{ item.nombre }}</h3>
                  <div class="item-price">{{ item.precio | currency:'ARS' }}</div>
                </div>

                <div class="item-quantity">
                  <button mat-icon-button (click)="cambiarCantidad(item, -1)">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="qty-number">{{ item.cantidad }}</span>
                  <button mat-icon-button (click)="cambiarCantidad(item, 1)">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>

                <div class="item-subtotal">
                  {{ item.precio * item.cantidad | currency:'ARS' }}
                </div>

                <div class="item-actions">
                  <button mat-icon-button color="warn" (click)="eliminar(item.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </mat-card>
            }
          </div>

          <div class="cart-summary">
            <mat-card class="mat-elevation-z2">
              <mat-card-header>
                <mat-card-title>Resumen de compra</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <app-resumen-totales
                  [subtotal]="carrito.totalPrecio()"
                  [labelSubtotal]="'Productos (' + carrito.totalItems() + ')'"
                  [costoEnvio]="0"
                  [total]="carrito.totalPrecio()">
                </app-resumen-totales>
              </mat-card-content>
              <mat-card-actions>
                <button mat-flat-button color="primary" class="full-width btn-checkout" routerLink="/checkout">
                  Continuar compra
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 48px 24px;
    }
    .page-title { margin: 0 0 32px 0; font-size: 2rem; font-weight: 700; color: var(--white); }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-lg);
    }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; color: var(--ash); margin-bottom: 24px; }
    .empty-state h2 { font-size: 2rem; color: var(--white); margin-bottom: 8px; }
    .empty-state p { font-size: 1.1rem; color: var(--ash); margin-bottom: 32px; }
    .btn-catalogo { background-color: var(--signal) !important; padding: 8px 24px; border-radius: var(--radius-sm); }

    .cart-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
      align-items: start;
    }

    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cart-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 16px;
      gap: 24px;
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
    }
    .item-img {
      width: 100px; height: 100px;
      background: #f8fafc;
      border-radius: var(--radius-sm);
      padding: 8px;
      cursor: pointer;
    }
    .item-img img { width: 100%; height: 100%; object-fit: contain; }

    .item-details { flex: 1; }
    .item-details h3 { margin: 0 0 8px 0; font-size: 1.1rem; color: var(--white); cursor: pointer; }
    .item-details h3:hover { text-decoration: underline; color: var(--signal); }
    .item-price { font-weight: 600; color: var(--ash); font-size: 1.1rem; }

    .item-quantity {
      display: flex;
      align-items: center;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: 20px;
      padding: 4px;
    }
    .item-quantity ::ng-deep .mat-icon { color: var(--white); }
    .qty-number { font-weight: 600; font-size: 1.1rem; width: 32px; text-align: center; color: var(--white); }

    .item-subtotal { font-size: 1.25rem; font-weight: 700; color: var(--white); min-width: 120px; text-align: right; }

    .cart-summary {
      position: sticky;
      top: 90px;
    }
    /* mat-card es transparent !important a nivel global (ver styles.css):
       sin esto el título hereda el color oscuro por defecto de Material,
       invisible sobre --void. Mismo patrón que checkout-summary. */
    .cart-summary ::ng-deep .mat-mdc-card-title { color: var(--white); }

    .full-width { width: 100%; }
    /* Azul de marca explícito en vez del "primary" genérico del tema de
       Material (quedaba de un tono más apagado): mismo --signal que usa el
       botón de pago del checkout, para que se lea como "el próximo paso". */
    .btn-checkout {
      padding: 8px 0;
      font-size: 1.1rem;
      margin-top: 16px;
      border-radius: var(--radius-sm);
      background-color: var(--signal) !important;
    }

    @media (max-width: 900px) {
      .cart-layout { grid-template-columns: 1fr; }
      .cart-item { flex-wrap: wrap; }
      .item-subtotal { width: 100%; text-align: left; margin-top: 16px; }
      .item-actions { margin-left: auto; }
    }
  `]
})
export class CarritoComponent {
  carrito = inject(CarritoService);

  cambiarCantidad(item: ItemCarrito, delta: number) {
    this.carrito.actualizarCantidad(item.id, item.cantidad + delta);
  }

  eliminar(id: number) {
    this.carrito.eliminar(id);
  }
}
