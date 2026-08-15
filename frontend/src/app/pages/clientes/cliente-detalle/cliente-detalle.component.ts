import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService, Cliente } from '../../../services/clientes.service';
import { PagoDeudaHistoricaDialogComponent } from '../pago-deuda-historica-dialog/pago-deuda-historica-dialog.component';

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>Detalle del Cliente</h2>
    <mat-dialog-content>
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (cliente()) {
        <div class="detalle-container">
          <div class="info-card">
            <h3>Información Personal</h3>
            <div class="info-row">
              <span class="label">Nombre:</span>
              <span class="value">
                {{ cliente()?.nombre }}
                @if (cliente()?.historial_crediticio === 'Bueno' || cliente()?.historial_crediticio === 'Excelente') {
                  <span class="badge-historial" [class.excelente]="cliente()?.historial_crediticio === 'Excelente'">
                    ✓ Cliente Cumplidor
                  </span>
                }
              </span>
            </div>
            <div class="info-row"><span class="label">Email:</span> <span class="value">{{ cliente()?.email || 'No registrado' }}</span></div>
            <div class="info-row"><span class="label">Teléfono:</span> <span class="value">{{ cliente()?.telefono || 'No registrado' }}</span></div>
            <div class="info-row"><span class="label">Dirección:</span> <span class="value">{{ cliente()?.direccion || 'No registrada' }}</span></div>
            <div class="info-row"><span class="label">Fecha alta:</span> <span class="value">{{ cliente()?.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="info-card">
            <h3>Notas</h3>
            <p class="notas-text">{{ cliente()?.notas || 'Sin notas adicionales.' }}</p>
          </div>
          
          <mat-divider></mat-divider>

          <div class="info-card">
            <h3>Deuda Histórica</h3>
            @if (cliente()?.estado_cliente === 'MOROSO') {
              <div class="deuda-alerta">
                <mat-icon>report</mat-icon>
                <div class="deuda-alerta-body">
                  <span class="deuda-alerta-label">DEUDA HISTÓRICA</span>
                  <span class="deuda-alerta-monto">{{ cliente()?.deuda_historica | currency:'ARS' }}</span>
                </div>
              </div>
              <p class="muted-text">
                <i class="material-icons info-icon">info</i>
                Saldo migrado de un sistema anterior. El cliente no puede tomar créditos nuevos hasta cancelarlo.
              </p>
              <button mat-flat-button color="warn" class="btn-registrar-pago" (click)="registrarPagoDeuda()">
                <mat-icon>payments</mat-icon> Registrar Pago de Deuda
              </button>
            } @else {
              <p class="muted-text">
                <i class="material-icons info-icon">check_circle</i>
                Este cliente no registra deuda histórica.
              </p>
            }
          </div>
        </div>
      } @else {
        <p class="error-msg">No se encontró información del cliente.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 60px 0;
    }
    .detalle-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: min(450px, 100%);
      padding-top: 8px;
    }
    .info-card h3 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #3f51b5;
      font-size: 1.1rem;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }
    .label {
      font-weight: 500;
      width: 120px;
      color: #555;
    }
    .value {
      flex: 1;
      color: #111;
    }
    .badge-historial {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
    }
    .badge-historial.excelente {
      background: #fef9c3;
      color: #a16207;
    }
    .notas-text {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      font-style: italic;
      margin: 0;
    }
    .muted-text {
      color: #777;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-icon {
      font-size: 1.2rem;
    }
    .error-msg {
      color: #f44336;
      text-align: center;
    }
    .deuda-alerta {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 12px;
      color: #b91c1c;
    }
    .deuda-alerta mat-icon { flex-shrink: 0; }
    .deuda-alerta-body { display: flex; flex-direction: column; gap: 2px; }
    .deuda-alerta-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; }
    .deuda-alerta-monto { font-size: 1.3rem; font-weight: 800; }
    .btn-registrar-pago { margin-top: 4px; }
  `]
})
export class ClienteDetalleComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ClienteDetalleComponent>);
  data = inject(MAT_DIALOG_DATA);
  clientesService = inject(ClientesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  cliente = signal<Cliente | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    if (this.data?.clienteId) {
      this.cargarDetalle(this.data.clienteId);
    } else {
      this.isLoading.set(false);
    }
  }

  cargarDetalle(id: number) {
    this.clientesService.obtener(id).subscribe({
      next: (res) => {
        this.cliente.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  registrarPagoDeuda() {
    const clienteActual = this.cliente();
    if (!clienteActual) return;

    const dialogRef = this.dialog.open(PagoDeudaHistoricaDialogComponent, {
      width: '440px',
      data: { clienteId: clienteActual.id, deudaActual: clienteActual.deuda_historica }
    });

    dialogRef.afterClosed().subscribe((resultado: { id: number; deuda_historica: number; estado_cliente: 'AL_DIA' | 'MOROSO' } | undefined) => {
      if (!resultado) return;

      // Se actualiza el signal local en vez de refetchear: el backend ya
      // confirmó el nuevo saldo, y así el badge/botón se actualizan al
      // instante sin una segunda ida y vuelta al servidor.
      this.cliente.update((actual) => actual ? { ...actual, deuda_historica: resultado.deuda_historica, estado_cliente: resultado.estado_cliente } : actual);
      this.snackBar.open('Pago registrado correctamente', 'Cerrar', { duration: 4000 });
    });
  }
}
