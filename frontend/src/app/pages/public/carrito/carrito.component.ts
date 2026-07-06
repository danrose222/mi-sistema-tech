import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { CarritoService, ItemCarrito } from '../../../services/carrito.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="page-container">
      <h1 class="page-title">Mi Carrito</h1>

      @if (carrito.items().length === 0) {
        <div class="empty-state">
          <mat-icon>shopping_cart</mat-icon>
          <h2>Tu carrito está vacío</h2>
          <p>¡Explorá nuestro catálogo y encontrá lo que buscás!</p>
          <button mat-flat-button color="primary" routerLink="/productos">Ir al catálogo</button>
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
                <div class="summary-row">
                  <span>Productos ({{ carrito.totalItems() }})</span>
                  <span>{{ carrito.totalPrecio() | currency:'ARS' }}</span>
                </div>
                <div class="summary-row">
                  <span>Envío</span>
                  <span class="free-shipping">Gratis</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span>{{ carrito.totalPrecio() | currency:'ARS' }}</span>
                </div>
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
    .page-title { margin: 0 0 32px 0; font-size: 2rem; font-weight: 700; color: #0f172a; }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; color: #cbd5e1; margin-bottom: 24px; }
    .empty-state h2 { font-size: 2rem; color: #1e293b; margin-bottom: 8px; }
    .empty-state p { font-size: 1.1rem; color: #64748b; margin-bottom: 32px; }

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
      border-radius: 12px;
    }
    .item-img {
      width: 100px; height: 100px;
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
    }
    .item-img img { width: 100%; height: 100%; object-fit: contain; }
    
    .item-details { flex: 1; }
    .item-details h3 { margin: 0 0 8px 0; font-size: 1.1rem; color: #1e293b; cursor: pointer; }
    .item-details h3:hover { text-decoration: underline; color: #0284c7; }
    .item-price { font-weight: 600; color: #64748b; font-size: 1.1rem; }

    .item-quantity {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      border-radius: 20px;
      padding: 4px;
    }
    .qty-number { font-weight: 600; font-size: 1.1rem; width: 32px; text-align: center; }

    .item-subtotal { font-size: 1.25rem; font-weight: 700; color: #0284c7; min-width: 120px; text-align: right; }

    .cart-summary {
      position: sticky;
      top: 90px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      color: #475569;
      font-size: 1.1rem;
    }
    .free-shipping { color: #16a34a; font-weight: 600; }
    .summary-row.total {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
    }
    
    .full-width { width: 100%; }
    .btn-checkout { padding: 8px 0; font-size: 1.1rem; margin-top: 16px; border-radius: 8px; }

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
