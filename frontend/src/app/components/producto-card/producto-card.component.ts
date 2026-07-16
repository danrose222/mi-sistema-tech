import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="product card">
      <a class="product-img" [routerLink]="['/producto', producto.slug]">
        @if (producto.imagenes?.[0]) {
          <img [src]="producto.imagenes[0]" [alt]="producto.nombre" loading="lazy">
        } @else {
          <div class="product-placeholder" aria-hidden="true">
            <mat-icon>devices</mat-icon>
          </div>
        }
      </a>
      <div class="product-body">
        <a class="product-name" [routerLink]="['/producto', producto.slug]">{{ producto.nombre }}</a>
        <span class="product-price">{{ producto.precio | currency:'ARS':'symbol':'1.0-0' }}</span>
      </div>
      <div class="product-footer">
        <div class="qty-selector">
          <button
            type="button"
            class="qty-btn"
            (click)="decrementar()"
            [disabled]="cantidad() <= 1"
            aria-label="Restar unidad">
            <mat-icon>remove</mat-icon>
          </button>
          <span class="qty-value">{{ cantidad() }}</span>
          <button
            type="button"
            class="qty-btn"
            (click)="incrementar()"
            [disabled]="alcanzoStockMaximo()"
            aria-label="Sumar unidad">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <button
          class="btn-primary product-btn"
          (click)="agregarAlCarrito()"
          [disabled]="sinStock()">
          <mat-icon>add_shopping_cart</mat-icon>
          {{ sinStock() ? 'Sin stock' : 'Agregar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .product-img {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 220px;
      background: var(--void);
      overflow: hidden;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    .product-img img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      transition: transform 0.3s ease;
      padding: 16px;
    }
    .product:hover .product-img img {
      transform: scale(1.05);
    }
    .product-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 42%, rgba(0, 174, 239, 0.14) 0%, transparent 68%);
      transition: background 0.3s ease;
    }
    .product:hover .product-placeholder {
      background: radial-gradient(circle at 50% 42%, rgba(0, 174, 239, 0.22) 0%, transparent 70%);
    }
    .product-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--ash);
      opacity: 0.55;
    }
    .product-body {
      padding: 20px 20px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .product-name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--white);
      text-decoration: none;
      line-height: 1.4;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: color 0.15s;
    }
    .product-name:hover { color: var(--pulse); }
    .product-price {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--signal);
      margin-top: auto;
    }
    .product-footer {
      padding: 16px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Selector de cantidad */
    .qty-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      padding: 4px;
    }
    .qty-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--white);
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .qty-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
    .qty-btn:disabled { color: var(--ash); cursor: not-allowed; opacity: 0.4; }
    .qty-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .qty-value {
      min-width: 32px;
      text-align: center;
      font-weight: 600;
      color: var(--white);
      font-family: var(--font-display);
    }

    .product-btn {
      width: 100%;
      padding: 10px 16px;
      font-size: 0.9rem;
    }
    .product-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class ProductoCardComponent {
  @Input({ required: true }) producto!: any;

  private carritoService = inject(CarritoService);
  private snackBar = inject(MatSnackBar);

  // Cantidad elegida por el usuario antes de mandarla al carrito (mínimo 1).
  cantidad = signal(1);

  private stockDisponible(): number | undefined {
    return this.producto?.stock;
  }

  sinStock(): boolean {
    const stock = this.stockDisponible();
    return stock !== undefined && stock <= 0;
  }

  alcanzoStockMaximo(): boolean {
    const stock = this.stockDisponible();
    return stock !== undefined && this.cantidad() >= stock;
  }

  incrementar() {
    if (this.alcanzoStockMaximo()) return;
    this.cantidad.update(c => c + 1);
  }

  decrementar() {
    if (this.cantidad() <= 1) return;
    this.cantidad.update(c => c - 1);
  }

  agregarAlCarrito() {
    if (this.sinStock()) return;

    this.carritoService.agregar(this.producto, this.cantidad());
    this.snackBar.open(`${this.cantidad()} × ${this.producto.nombre} agregado al carrito`, 'Ver Carrito', {
      duration: 3000
    });
    this.cantidad.set(1);
  }
}
