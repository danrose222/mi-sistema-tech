import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CarritoService } from '../../../services/carrito.service';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div class="page-container">
      <div class="checkout-header">
        <button mat-icon-button routerLink="/carrito"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Finalizar Compra</h1>
      </div>

      <div class="checkout-layout">
        <div class="checkout-form">
          <mat-card class="mat-elevation-z2">
            <mat-card-header>
              <mat-card-title>Datos de Facturación y Envío</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="checkoutForm" class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nombre Completo</mat-label>
                  <input matInput formControlName="nombre">
                  <mat-error>Nombre es requerido</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email">
                  <mat-error>Email válido requerido</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Teléfono</mat-label>
                  <input matInput type="tel" formControlName="telefono">
                  <mat-error>Teléfono es requerido</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Dirección de Envío</mat-label>
                  <input matInput formControlName="direccion">
                  <mat-error>Dirección es requerida</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Notas Adicionales (Opcional)</mat-label>
                  <textarea matInput formControlName="notas" rows="3"></textarea>
                </mat-form-field>
              </form>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="checkout-summary">
          <mat-card class="mat-elevation-z2">
            <mat-card-header>
              <mat-card-title>Resumen de tu Pedido</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="items-mini-list">
                @for (item of carrito.items(); track item.id) {
                  <div class="mini-item">
                    <span class="mini-qty">{{ item.cantidad }}x</span>
                    <span class="mini-name">{{ item.nombre }}</span>
                    <span class="mini-price">{{ item.precio * item.cantidad | currency:'ARS' }}</span>
                  </div>
                }
              </div>

              <div class="summary-totals">
                <div class="summary-row">
                  <span>Envío</span>
                  <span class="free-shipping">Gratis</span>
                </div>
                <div class="summary-row total">
                  <span>Total a Pagar</span>
                  <span>{{ carrito.totalPrecio() | currency:'ARS' }}</span>
                </div>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="primary" class="full-width btn-pay" 
                      [disabled]="checkoutForm.invalid || isProcessing"
                      (click)="pagar()">
                {{ isProcessing ? 'Procesando...' : 'Pagar con MercadoPago' }}
              </button>
              <div class="mp-badge">
                <mat-icon>security</mat-icon> Pagos seguros por MercadoPago
              </div>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 48px 24px;
    }
    .checkout-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }
    .page-title { margin: 0; font-size: 2rem; font-weight: 700; color: #0f172a; }

    .checkout-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
      align-items: start;
    }

    mat-card { border-radius: 12px; padding: 8px 0; }
    mat-card-header { margin-bottom: 24px; }
    mat-card-title { font-size: 1.25rem !important; font-weight: 600; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width { grid-column: 1 / -1; width: 100%; }

    /* Summary */
    .items-mini-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      max-height: 300px;
      overflow-y: auto;
    }
    .mini-item {
      display: flex;
      gap: 12px;
      font-size: 0.95rem;
      color: #334155;
    }
    .mini-qty { font-weight: 600; color: #64748b; }
    .mini-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mini-price { font-weight: 600; }

    .summary-totals {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
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
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0;
    }

    .btn-pay { padding: 12px 0; font-size: 1.1rem; border-radius: 8px; margin-bottom: 16px; }
    
    .mp-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #0ea5e9;
      font-size: 0.85rem;
      font-weight: 500;
      width: 100%;
    }
    .mp-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }

    @media (max-width: 900px) {
      .checkout-layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CheckoutComponent {
  carrito = inject(CarritoService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private platformId = inject(PLATFORM_ID);

  isProcessing = false;

  checkoutForm = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.required],
    direccion: ['', Validators.required],
    notas: ['']
  });

  constructor() {
    if (this.carrito.items().length === 0) {
      this.router.navigate(['/carrito']);
    }
  }

  pagar() {
    if (this.checkoutForm.invalid || this.isProcessing) return;

    this.isProcessing = true;

    const { nombre, email, telefono } = this.checkoutForm.value;
    const pedido = {
      items: this.carrito.items().map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad
      })),
      payer: {
        email: email!,
        name: nombre!,
        phone: { number: telefono! }
      }
    };

    this.orderService.crear(pedido).subscribe({
      next: (res) => {
        this.carrito.vaciar();
        if (isPlatformBrowser(this.platformId)) {
          window.location.href = res.pago_link;
        }
      },
      error: (err) => {
        this.isProcessing = false;
        const mensaje = err?.error?.error || 'No pudimos procesar tu pedido. Intentá de nuevo.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      }
    });
  }
}
