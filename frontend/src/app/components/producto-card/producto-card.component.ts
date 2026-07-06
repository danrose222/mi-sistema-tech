import { Component, Input, inject } from '@angular/core';
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
        <img [src]="producto.imagenes?.[0] || 'assets/producto-ejemplo.jpeg'" [alt]="producto.nombre" loading="lazy">
      </a>
      <div class="product-body">
        <a class="product-name" [routerLink]="['/producto', producto.slug]">{{ producto.nombre }}</a>
        <span class="product-price">{{ producto.precio | currency:'ARS':'symbol':'1.0-0' }}</span>
      </div>
      <div class="product-footer">
        <button class="btn-primary product-btn" (click)="agregarAlCarrito()">
          <mat-icon>add_shopping_cart</mat-icon>
          Agregar
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

  agregarAlCarrito() {
    this.carritoService.agregar(this.producto, 1);
    this.snackBar.open(`${this.producto.nombre} agregado al carrito`, 'Ver Carrito', {
      duration: 3000
    });
  }
}
