import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderService, PedidoDetalle } from '../../../services/order.service';
import { WhatsappService } from '../../../services/whatsapp.service';

@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title class="pantalla-only">Pedido #{{ data.pedidoId }}</h2>
    <mat-dialog-content>
      @if (isLoading()) {
        <div class="loading-container pantalla-only">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (pedido()) {
        <div class="detalle-container">
          <!-- Encabezado exclusivo de impresión: oculto en pantalla -->
          <header class="print-header">
            <h1>COMPROBANTE DE VENTA</h1>
            <p class="print-no-fiscal">DOCUMENTO NO VÁLIDO COMO FACTURA</p>
            <p class="print-local">Cel Shop Center - Dean Funes 463, Capilla del Monte, Córdoba</p>
            <div class="print-meta">
              <span>Fecha y hora: {{ pedido()?.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              <span>Pedido N°: {{ data.pedidoId }}</span>
            </div>
            <p class="print-cliente">Cliente: {{ pedido()?.cliente_nombre || 'Consumidor final' }}</p>
          </header>

          <div class="info-card pantalla-only">
            <div class="info-row">
              <span class="label">Cliente:</span>
              <span class="value">{{ pedido()?.cliente_nombre || 'Consumidor final' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Teléfono:</span>
              <span class="value">{{ pedido()?.cliente_telefono || 'No registrado' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Estado:</span>
              <span class="badge" [class]="'estado-' + pedido()?.estado">{{ pedido()?.estado }}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha:</span>
              <span class="value">{{ pedido()?.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            @if (pedido()?.pago_link) {
              <div class="info-row">
                <span class="label">Link de pago:</span>
                <a class="value link" [href]="pedido()?.pago_link" target="_blank" rel="noopener">Ver en MercadoPago</a>
              </div>
            }
          </div>

          <mat-divider class="pantalla-only"></mat-divider>

          <div class="info-card">
            <h3 class="pantalla-only">Items</h3>
            <table class="items-table">
              <thead>
                <tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                @for (item of pedido()?.items; track item.id) {
                  <tr>
                    <td>{{ item.producto_nombre }}</td>
                    <td>{{ item.cantidad }}</td>
                    <td>{{ item.precio_unitario | currency:'ARS' }}</td>
                    <td>{{ item.cantidad * item.precio_unitario | currency:'ARS' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="footer-info">
              <span>Método de pago: {{ metodoPago() }}</span>
            </div>
            <div class="total-row">
              <span>Total</span>
              <span class="total-value">{{ pedido()?.total | currency:'ARS' }}</span>
            </div>
          </div>
        </div>
      } @else {
        <p class="error-msg">No se encontró información del pedido.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="pantalla-only">
      <button
        mat-stroked-button
        [disabled]="isLoading() || !pedido()"
        (click)="imprimirComprobante()"
        matTooltip="Imprimir comprobante de venta (no fiscal)">
        <mat-icon>print</mat-icon>
        Imprimir Comprobante
      </button>
      <button
        mat-stroked-button
        color="primary"
        [disabled]="!pedido()?.cliente_telefono || isSendingReminder()"
        (click)="enviarRecordatorio()"
        matTooltip="Enviar recordatorio de pago por WhatsApp">
        <mat-icon>chat</mat-icon>
        {{ isSendingReminder() ? 'Enviando...' : 'Enviar recordatorio WhatsApp' }}
      </button>
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .loading-container { display: flex; justify-content: center; align-items: center; padding: 60px 0; }
    .detalle-container { display: flex; flex-direction: column; gap: 20px; min-width: 500px; padding-top: 8px; }
    .info-card h3 { margin-top: 0; margin-bottom: 12px; color: #3f51b5; font-size: 1.1rem; }
    .info-row { display: flex; margin-bottom: 8px; font-size: 0.95rem; }
    .label { font-weight: 500; width: 120px; color: #555; }
    .value { flex: 1; color: #111; }
    .value.link { color: #0ea5e9; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
      width: fit-content;
    }
    .estado-pendiente { background: #fef3c7; color: #b45309; }
    .estado-pagado { background: #dcfce7; color: #16a34a; }
    .estado-cancelado { background: #fee2e2; color: #dc2626; }
    .estado-enviado { background: #dbeafe; color: #2563eb; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .items-table th { text-align: left; color: #64748b; font-weight: 500; padding: 8px 4px; border-bottom: 1px solid #e2e8f0; }
    .items-table td { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; color: #111; }
    .footer-info { margin-top: 12px; font-size: 0.85rem; color: #64748b; }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-weight: 700;
      font-size: 1.05rem;
    }
    .error-msg { color: #f44336; text-align: center; }

    /* Encabezado exclusivo de impresión: oculto en pantalla */
    .print-header { display: none; }

    /* ══════════════════════════════════════════════════════════════════
       IMPRESIÓN: este componente vive dentro de un mat-dialog (CDK Overlay),
       no en el router-outlet, así que "ocultar sidenav/navbar/paginador" no
       alcanza con reglas locales: hay que apagar todo lo que está fuera del
       overlay. Eso se resuelve globalmente en styles.css (ver clase
       body.imprimiendo-comprobante), disparada por imprimirComprobante().
       Acá solo se define cómo se ve el contenido propio del comprobante. */
    @media print {
      :host { display: block; }
      .pantalla-only { display: none !important; }

      .detalle-container { min-width: 0; gap: 0; }

      .print-header {
        display: block;
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #000;
      }
      .print-header h1 {
        margin: 0 0 6px;
        font-size: 1.8rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        color: #000;
      }
      .print-no-fiscal {
        margin: 0 0 12px;
        font-weight: 700;
        font-size: 0.95rem;
        color: #000;
      }
      .print-local { margin: 0 0 8px; color: #000; font-size: 0.9rem; }
      .print-meta {
        display: flex;
        justify-content: center;
        gap: 24px;
        font-size: 0.85rem;
        color: #333;
        margin-bottom: 8px;
      }
      .print-cliente { margin: 0; font-weight: 600; color: #000; text-align: left; }

      .info-card { background: #fff !important; }
      .items-table th, .items-table td { color: #000 !important; border-color: #333 !important; }
      .footer-info { color: #000 !important; }
      .total-row { border-top: 2px solid #000 !important; color: #000 !important; }
      .total-value { font-size: 1.3rem; }
    }
  `]
})
export class PedidoDetalleComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<PedidoDetalleComponent>);
  data = inject(MAT_DIALOG_DATA);
  orderService = inject(OrderService);
  whatsappService = inject(WhatsappService);
  snackBar = inject(MatSnackBar);

  pedido = signal<PedidoDetalle | null>(null);
  isLoading = signal(true);
  isSendingReminder = signal(false);

  private static readonly METODOS_PAGO_LABEL: Record<string, string> = {
    mercado_pago: 'Mercado Pago',
    transferencia: 'Transferencia Bancaria',
    efectivo_local: 'Efectivo en Local'
  };

  metodoPago = computed(() => {
    const metodo = this.pedido()?.metodo_pago;
    return metodo ? (PedidoDetalleComponent.METODOS_PAGO_LABEL[metodo] || metodo) : 'No especificado';
  });

  // El diálogo es un CDK Overlay fuera del router-outlet: para imprimir solo
  // el comprobante (y no el sidenav/topbar/lista de pedidos de atrás) se
  // marca el body con una clase mientras dura la impresión (ver
  // body.imprimiendo-comprobante en styles.css) en vez de intentar ocultar
  // ese contenido ajeno desde los estilos scoped de este componente.
  private quitarClaseImpresion = () => {
    document.body.classList.remove('imprimiendo-comprobante');
  };

  constructor() {
    window.addEventListener('afterprint', this.quitarClaseImpresion);
  }

  ngOnDestroy() {
    window.removeEventListener('afterprint', this.quitarClaseImpresion);
    document.body.classList.remove('imprimiendo-comprobante');
  }

  imprimirComprobante() {
    document.body.classList.add('imprimiendo-comprobante');
    window.print();
  }

  ngOnInit() {
    this.orderService.obtener(this.data.pedidoId).subscribe({
      next: (res) => {
        this.pedido.set(res.data);
        this.isLoading.set(false);

        if (this.data.autoprint) {
          // setTimeout para dejar que Angular pinte el comprobante antes de
          // llamar a print(): si se llama en el mismo tick, el motor de
          // impresión puede capturar el spinner de carga en vez del detalle.
          setTimeout(() => this.imprimirComprobante(), 0);
        }
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  enviarRecordatorio() {
    this.isSendingReminder.set(true);
    this.whatsappService.enviarRecordatorio({ pedido_id: this.data.pedidoId }).subscribe({
      next: () => {
        this.snackBar.open('Recordatorio enviado por WhatsApp', 'Cerrar', { duration: 3000 });
        this.isSendingReminder.set(false);
      },
      error: (err) => {
        const mensaje = err?.error?.error || 'No se pudo enviar el recordatorio';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        console.error(err);
        this.isSendingReminder.set(false);
      }
    });
  }
}
