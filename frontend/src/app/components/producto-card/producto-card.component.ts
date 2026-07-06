import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card class="prod-card mat-elevation-z2">
      <div class="img-wrapper" [routerLink]="['/producto', producto.slug]">
        <img mat-card-image [src]="producto.imagenes?.[0] || 'assets/placeholder.jpg'" [alt]="producto.nombre" loading="lazy">
      </div>
      <mat-card-content class="prod-content">
        <p class="cat-name">{{ producto.categoria_nombre }}</p>
        <h3 class="prod-name" [routerLink]="['/producto', producto.slug]">{{ producto.nombre }}</h3>
        <p class="prod-price">{{ producto.precio | currency:'ARS' }}</p>
      </mat-card-content>
      <mat-card-actions class="prod-actions">
        <button mat-flat-button color="primary" class="full-width" (click)="agregarAlCarrito()">
          <mat-icon>add_shopping_cart</mat-icon> Comprar
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .prod-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .prod-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
    }
    .img-wrapper {
      height: 220px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      cursor: pointer;
      padding: 16px;
    }
    .img-wrapper img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      transition: transform 0.3s;
    }
    .prod-card:hover .img-wrapper img {
      transform: scale(1.05);
    }
    .prod-content {
      padding: 16px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    .cat-name {
      color: #64748b;
      font-size: 0.8rem;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .prod-name {
      margin: 0 0 12px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .prod-price {
      margin-top: auto;
      font-size: 1.3rem;
      font-weight: 700;
      color: #0284c7;
      margin-bottom: 0;
    }
    .prod-actions {
      padding: 0 16px 16px;
    }
    .full-width { width: 100%; }
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
