import { Component, inject, OnInit, signal } from '@angular/core';
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
    <h2 mat-dialog-title>Pedido #{{ data.pedidoId }}</h2>
    <mat-dialog-content>
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (pedido()) {
        <div class="detalle-container">
          <div class="info-card">
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

          <mat-divider></mat-divider>

          <div class="info-card">
            <h3>Items</h3>
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
    <mat-dialog-actions align="end">
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
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-weight: 700;
      font-size: 1.05rem;
    }
    .error-msg { color: #f44336; text-align: center; }
  `]
})
export class PedidoDetalleComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PedidoDetalleComponent>);
  data = inject(MAT_DIALOG_DATA);
  orderService = inject(OrderService);
  whatsappService = inject(WhatsappService);
  snackBar = inject(MatSnackBar);

  pedido = signal<PedidoDetalle | null>(null);
  isLoading = signal(true);
  isSendingReminder = signal(false);

  ngOnInit() {
    this.orderService.obtener(this.data.pedidoId).subscribe({
      next: (res) => {
        this.pedido.set(res.data);
        this.isLoading.set(false);
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
