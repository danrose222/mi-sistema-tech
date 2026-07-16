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
                <mat-icon class="mp-btn-icon">account_balance_wallet</mat-icon>
                {{ isProcessing ? 'Procesando...' : 'Pagar con MercadoPago' }}
              </button>
              <div class="mp-badge">
                <mat-icon>verified_user</mat-icon>
                <span>Pagos seguros procesados por <strong>Mercado Pago</strong></span>
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
    .page-title { margin: 0; font-size: 2rem; font-weight: 700; color: var(--white); }

    .checkout-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
      align-items: start;
    }

    mat-card { border-radius: 12px; padding: 8px 0; }
    mat-card-header { margin-bottom: 24px; }
    mat-card-title { font-size: 1.25rem !important; font-weight: 600; }

    /* mat-card-title del formulario de facturación: sin esto hereda el
       color oscuro por defecto de Material, invisible sobre --void ya que
       .mat-mdc-card es transparent !important a nivel global. */
    .checkout-form ::ng-deep .mat-mdc-card-title {
      color: var(--white);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width { grid-column: 1 / -1; width: 100%; }

    /* Los inputs viven en una mat-card transparente flotando sobre el fondo
       oscuro de la página: Material pinta el texto tipeado con el color de
       su tema claro por defecto -> ilegible. Se le da superficie propia
       (--slate) al campo y se fuerza el texto a --white. */
    .checkout-form ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: var(--slate);
      border-radius: var(--radius-sm);
    }
    .checkout-form ::ng-deep input.mat-mdc-input-element,
    .checkout-form ::ng-deep textarea.mat-mdc-input-element {
      color: var(--white) !important;
      caret-color: var(--white);
    }
    .checkout-form ::ng-deep input.mat-mdc-input-element::placeholder,
    .checkout-form ::ng-deep textarea.mat-mdc-input-element::placeholder {
      color: var(--ash) !important;
      opacity: 1;
    }
    .checkout-form ::ng-deep .mat-mdc-floating-label {
      color: var(--ash) !important;
    }
    .checkout-form ::ng-deep .mat-mdc-form-field-hint {
      color: var(--ash);
    }
    .checkout-form ::ng-deep .mat-mdc-form-field-error {
      color: var(--danger);
    }
    .checkout-form ::ng-deep .mdc-notched-outline__leading,
    .checkout-form ::ng-deep .mdc-notched-outline__notch,
    .checkout-form ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--border-dim) !important;
    }
    .checkout-form ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    .checkout-form ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    .checkout-form ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--signal) !important;
      border-width: 2px;
    }

    /* Summary */
    .items-mini-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      max-height: 300px;
      overflow-y: auto;
    }
    /* Igual que .checkout-form: mat-card es transparente a nivel global, así
       que este panel flota sobre --void y necesita sus propios colores
       claros en vez de la paleta oscura pensada para tarjetas blancas. */
    .checkout-summary ::ng-deep .mat-mdc-card-title {
      color: var(--white);
    }
    .mini-item {
      display: flex;
      gap: 12px;
      font-size: 0.95rem;
      color: var(--white);
    }
    .mini-qty { font-weight: 600; color: var(--ash); }
    .mini-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mini-price { font-weight: 600; }

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
    .summary-row.total {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--white);
      margin-bottom: 0;
    }

    /* No tenemos el archivo de marca oficial de Mercado Pago disponible, así
       que en vez de imitar su isotipo se usa su azul de marca (#009ee3) para
       que el botón y el sello de abajo se lean como "esto lo procesa
       Mercado Pago" sin reproducir su logo. */
    .btn-pay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 0;
      font-size: 1.1rem;
      border-radius: 8px;
      margin-bottom: 16px;
      background-color: #009ee3 !important;
    }
    .mp-btn-icon { font-size: 20px; width: 20px; height: 20px; }
    /* El estado disabled de Material calcula su color/fondo a partir de negro
       semitransparente (pensado para superficies claras): sobre --void queda
       un gris casi invisible. Se sobreescribe con la paleta oscura propia. */
    .btn-pay:disabled {
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: var(--ash) !important;
    }

    .mp-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(0, 158, 227, 0.1);
      border: 1px solid rgba(0, 158, 227, 0.25);
      border-radius: var(--radius-sm);
      color: var(--ash);
      font-size: 0.8rem;
      width: 100%;
      box-sizing: border-box;
    }
    .mp-badge mat-icon { font-size: 18px; width: 18px; height: 18px; color: #009ee3; flex-shrink: 0; }
    .mp-badge strong { color: #29b6f6; font-weight: 700; }

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
