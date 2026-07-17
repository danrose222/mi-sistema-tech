import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
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
import { OrderService, MetodoPago } from '../../../services/order.service';

interface OpcionMetodoPago {
  valor: MetodoPago;
  titulo: string;
  descripcion: string;
  icono: string;
}

interface PedidoConfirmado {
  pedidoId: number;
  metodoPago: MetodoPago;
}

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
      @if (pedidoConfirmado(); as confirmado) {
        <div class="success-screen">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <h1 class="success-title">¡Pedido Confirmado!</h1>
          <p class="success-subtitle">Tu pedido <strong>#{{ confirmado.pedidoId }}</strong> quedó registrado.</p>

          @if (confirmado.metodoPago === 'transferencia') {
            <div class="datos-bancarios-card">
              <h2>Datos para la Transferencia</h2>
              <p class="datos-bancarios-hint">
                Coordiná el pago por WhatsApp o en el local. Cuando se acredite la transferencia, confirmamos tu pedido.
              </p>
              <div class="dato-row"><span class="dato-label">Titular</span><span class="dato-valor">{{ datosBancarios.titular }}</span></div>
              <div class="dato-row"><span class="dato-label">CBU</span><span class="dato-valor">{{ datosBancarios.cbu }}</span></div>
              <div class="dato-row"><span class="dato-label">Alias</span><span class="dato-valor">{{ datosBancarios.alias }}</span></div>
            </div>
          } @else {
            <p class="success-info">Pagás al retirar tu pedido en el local. Te contactaremos para coordinar la entrega.</p>
          }

          <button mat-flat-button color="primary" class="btn-volver" routerLink="/">Volver al inicio</button>
        </div>
      } @else {
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
                  <mat-label>DNI</mat-label>
                  <input matInput formControlName="dni" inputmode="numeric" maxlength="8" placeholder="Sin puntos">
                  <mat-error>DNI válido requerido (7 u 8 dígitos)</mat-error>
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

              <div class="metodo-pago-selector">
                <h3 class="metodo-pago-heading">Método de Pago</h3>
                <div class="metodo-pago-grid" role="radiogroup" aria-label="Método de pago">
                  @for (opcion of metodosPago; track opcion.valor) {
                    <button
                      type="button"
                      class="metodo-pago-opcion"
                      role="radio"
                      [attr.aria-checked]="metodoPago() === opcion.valor"
                      [class.selected]="metodoPago() === opcion.valor"
                      (click)="metodoPago.set(opcion.valor)">
                      <mat-icon>{{ opcion.icono }}</mat-icon>
                      <div class="metodo-pago-texto">
                        <span class="metodo-pago-titulo">{{ opcion.titulo }}</span>
                        <span class="metodo-pago-desc">{{ opcion.descripcion }}</span>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button color="primary" class="full-width btn-pay"
                      [class.btn-pay--mp]="metodoPago() === 'mercado_pago'"
                      [disabled]="checkoutForm.invalid || isProcessing()"
                      (click)="pagar()">
                <mat-icon class="mp-btn-icon">{{ iconoBoton() }}</mat-icon>
                {{ textoBoton() }}
              </button>
              @if (metodoPago() === 'mercado_pago') {
                <div class="mp-badge">
                  <mat-icon>verified_user</mat-icon>
                  <span>Pagos seguros procesados por <strong>Mercado Pago</strong></span>
                </div>
              }
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
    mat-card-actions {
      display: flex;
      flex-direction: column;
    }

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
       Mercado Pago" sin reproducir su logo. Para transferencia/efectivo el
       botón vuelve al --signal del tema: no hay pasarela de por medio. */
    .btn-pay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 0;
      font-size: 1.1rem;
      border-radius: 8px;
      margin-bottom: 16px;
      background-color: var(--signal) !important;
    }
    .btn-pay.btn-pay--mp { background-color: #009ee3 !important; }
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

    /* Selector de método de pago */
    .metodo-pago-selector {
      border-top: 1px solid var(--border-dim);
      padding-top: 20px;
      margin-top: 24px;
    }
    .metodo-pago-heading {
      margin: 0 0 12px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--white);
    }
    .metodo-pago-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .metodo-pago-opcion {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      color: var(--white);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-body);
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .metodo-pago-opcion:hover { border-color: var(--border-hover); }
    .metodo-pago-opcion.selected {
      border-color: var(--signal);
      background: rgba(0, 174, 239, 0.08);
      box-shadow: 0 0 0 1px var(--signal);
    }
    .metodo-pago-opcion mat-icon { color: var(--signal); flex-shrink: 0; }
    .metodo-pago-texto { display: flex; flex-direction: column; gap: 2px; }
    .metodo-pago-titulo { font-size: 0.92rem; font-weight: 600; }
    .metodo-pago-desc { font-size: 0.78rem; color: var(--ash); }

    /* Pantalla de éxito (transferencia / efectivo en local) */
    .success-screen {
      max-width: 560px;
      margin: 80px auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .success-icon { font-size: 64px; width: 64px; height: 64px; color: var(--success); margin-bottom: 8px; }
    .success-title { margin: 0; font-size: 1.8rem; font-weight: 700; color: var(--white); }
    .success-subtitle { margin: 0 0 8px; color: var(--ash); font-size: 1.05rem; }
    .success-subtitle strong { color: var(--white); }
    .success-info {
      color: var(--ash);
      font-size: 0.95rem;
      max-width: 420px;
      line-height: 1.6;
      margin: 8px 0 24px;
    }
    .datos-bancarios-card {
      width: 100%;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 24px;
      margin: 16px 0 24px;
      text-align: left;
    }
    .datos-bancarios-card h2 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      color: var(--white);
      font-family: var(--font-display);
    }
    .datos-bancarios-hint {
      margin: 0 0 16px;
      color: var(--ash);
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .dato-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-top: 1px solid var(--border-dim);
      font-size: 0.95rem;
    }
    .dato-label { color: var(--ash); }
    .dato-valor { color: var(--white); font-weight: 600; }
    .btn-volver { padding: 10px 32px; }

    @media (max-width: 900px) {
      .checkout-layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .page-container { padding: 32px 16px; }
      .summary-row.total { font-size: 1.25rem; }
      .success-screen { margin: 40px auto; }
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

  isProcessing = signal(false);
  metodoPago = signal<MetodoPago>('mercado_pago');
  pedidoConfirmado = signal<PedidoConfirmado | null>(null);

  // TODO: reemplazar por el CBU/Alias reales del negocio antes de publicar
  // esta opción a clientes de verdad.
  readonly datosBancarios = {
    titular: 'Cel Shop Center',
    cbu: 'Pendiente de cargar',
    alias: 'Pendiente de cargar'
  };

  readonly metodosPago: OpcionMetodoPago[] = [
    { valor: 'mercado_pago', titulo: 'Mercado Pago', descripcion: 'Tarjetas, Rapipago, etc.', icono: 'account_balance_wallet' },
    { valor: 'transferencia', titulo: 'Transferencia Bancaria', descripcion: 'Acuerdo con el vendedor', icono: 'account_balance' },
    { valor: 'efectivo_local', titulo: 'Efectivo en Local', descripcion: 'Pagás al retirar tu pedido', icono: 'storefront' }
  ];

  textoBoton = computed(() => {
    if (this.isProcessing()) return 'Procesando...';
    return this.metodoPago() === 'mercado_pago' ? 'Pagar con MercadoPago' : 'Confirmar Pedido';
  });

  iconoBoton = computed(() => {
    return this.metodosPago.find((opcion) => opcion.valor === this.metodoPago())?.icono || 'shopping_cart_checkout';
  });

  checkoutForm = this.fb.group({
    nombre: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
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
    if (this.checkoutForm.invalid || this.isProcessing()) return;

    this.isProcessing.set(true);

    const { nombre, dni, email, telefono } = this.checkoutForm.value;
    const pedido = {
      items: this.carrito.items().map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad
      })),
      payer: {
        email: email!,
        name: nombre!,
        phone: { number: telefono! },
        dni: dni!
      },
      metodo_pago: this.metodoPago()
    };

    this.orderService.crear(pedido).subscribe({
      next: (res) => {
        this.carrito.vaciar();

        if (res.metodo_pago === 'mercado_pago' && res.pago_link) {
          if (isPlatformBrowser(this.platformId)) {
            window.location.href = res.pago_link;
          }
          return;
        }

        this.isProcessing.set(false);
        this.pedidoConfirmado.set({ pedidoId: res.pedido_id, metodoPago: res.metodo_pago });
      },
      error: (err) => {
        this.isProcessing.set(false);
        const mensaje = err?.error?.error || 'No pudimos procesar tu pedido. Intentá de nuevo.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      }
    });
  }
}
