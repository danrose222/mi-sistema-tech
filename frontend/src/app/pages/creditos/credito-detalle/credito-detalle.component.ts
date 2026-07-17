import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CreditosService, Credito, Cuota, ResultadoPagoCuota } from '../../../services/creditos.service';
import { NuevaCuotaDialogComponent } from '../nueva-cuota-dialog/nueva-cuota-dialog.component';

@Component({
  selector: 'app-credito-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <button mat-icon-button (click)="volver()" aria-label="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="page-title">Detalle de Crédito #{{ creditoId }}</h2>
        @if (credito()) {
          <button mat-icon-button color="warn" class="btn-eliminar" (click)="eliminarCredito()" matTooltip="Eliminar crédito">
            <mat-icon>delete</mat-icon>
          </button>
        }
      </div>

      @if (isLoading()) {
        <div class="loading-shade">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else if (credito(); as cred) {

        <!-- Tarjeta Superior: Resumen -->
        <div class="summary-card">
          <div class="summary-top">
            <div class="summary-identity">
              <span class="cliente-nombre">{{ cred.cliente_nombre }}</span>
              @if (cred.cliente_telefono) {
                <span class="cliente-telefono"><mat-icon>call</mat-icon>{{ cred.cliente_telefono }}</span>
              }
              @if (cred.producto_nombre) {
                <span class="producto-chip"><mat-icon>inventory_2</mat-icon>{{ cred.producto_nombre }}</span>
              }
            </div>
            <span class="estado-badge" [ngClass]="cred.estado">{{ estadoLabel(cred.estado) }}</span>
          </div>

          <div class="summary-figures">
            <div class="figure">
              <span class="figure-label">Monto Total</span>
              <span class="figure-value">{{ cred.monto_total | currency:'ARS' }}</span>
            </div>
            <div class="figure">
              <span class="figure-label">Cuotas</span>
              <span class="figure-value capitalize">{{ cred.cantidad_cuotas }} ({{ cred.frecuencia }})</span>
            </div>
            <div class="figure">
              <span class="figure-label">Pagado</span>
              <span class="figure-value figure-success">{{ (cred.resumen?.totalPagado || 0) | currency:'ARS' }}</span>
            </div>
            <div class="figure figure-destacada">
              <span class="figure-label">Saldo Pendiente</span>
              <span class="figure-value figure-saldo" [class.figure-danger]="cred.estado === 'moroso'">
                {{ (cred.resumen?.totalPendiente ?? cred.monto_total) | currency:'ARS' }}
              </span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-labels">
              <span>Progreso de Pagos</span>
              <span>{{ cuotasPagadas() }} / {{ cred.cantidad_cuotas }} cuotas pagadas</span>
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="porcentajeProgreso()"
              [color]="cred.estado === 'moroso' ? 'warn' : (porcentajeProgreso() === 100 ? 'primary' : 'accent')">
            </mat-progress-bar>
          </div>
        </div>

        <!-- Tarjeta Inferior: Tabla de Cuotas -->
        <div class="cuotas-card">
          <h3 class="cuotas-title">Plan de Cuotas</h3>

          <div class="table-wrapper">
            <table class="cuotas-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Monto</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th class="col-accion">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (cuota of cred.cuotas; track cuota.id) {
                  <tr [ngClass]="'fila-' + cuota.estado">
                    <td class="col-numero">{{ cuota.numero_cuota }}</td>
                    <td>
                      <span class="monto">{{ cuota.monto | currency:'ARS' }}</span>
                      @if (cuota.saldo_pendiente > 0 && cuota.saldo_pendiente < cuota.monto) {
                        <span class="saldo-parcial">Resta: {{ cuota.saldo_pendiente | currency:'ARS' }}</span>
                      }
                    </td>
                    <td>{{ cuota.fecha_vencimiento | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="cuota-estado-badge" [ngClass]="cuota.estado">
                        <mat-icon>{{ estadoIcono(cuota.estado) }}</mat-icon>
                        {{ estadoLabel(cuota.estado) }}
                      </span>
                    </td>
                    <td class="col-accion">
                      @if (cuota.estado === 'pendiente' || cuota.estado === 'vencida' || cuota.estado === 'parcial') {
                        <div class="acciones-cuota">
                          <button
                            type="button"
                            class="btn-whatsapp"
                            [disabled]="estaEnviandoRecordatorio(cuota.id)"
                            (click)="enviarRecordatorio(cuota)"
                            [matTooltip]="cuota.ultimo_recordatorio ? ('Último recordatorio: ' + (cuota.ultimo_recordatorio | date:'dd/MM/yyyy HH:mm')) : 'Enviar recordatorio por WhatsApp'">
                            @if (estaEnviandoRecordatorio(cuota.id)) {
                              <mat-icon class="spin">autorenew</mat-icon>
                            } @else {
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.04 3.67C14.24 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 13.99C16.31 13.87 15.09 13.27 14.87 13.19C14.64 13.11 14.48 13.07 14.31 13.32C14.15 13.56 13.68 14.11 13.54 14.28C13.4 14.44 13.25 14.46 13 14.34C12.75 14.21 11.94 13.95 10.98 13.09C10.23 12.42 9.73 11.6 9.59 11.36C9.44 11.11 9.57 10.98 9.7 10.85C9.81 10.74 9.95 10.56 10.08 10.42C10.21 10.27 10.25 10.17 10.34 10C10.42 9.83 10.38 9.69 10.32 9.56C10.25 9.44 9.75 8.21 9.55 7.71C9.35 7.23 9.15 7.29 9 7.29C8.86 7.28 8.7 7.28 8.53 7.28C8.37 7.28 8.1 7.34 7.88 7.58C7.65 7.83 7.02 8.42 7.02 9.65C7.02 10.89 7.9 12.08 8.03 12.24C8.16 12.41 9.72 14.85 12.14 15.86C12.72 16.11 13.17 16.25 13.53 16.36C14.11 16.54 14.64 16.51 15.06 16.45C15.53 16.38 16.5 15.86 16.7 15.29C16.9 14.71 16.9 14.22 16.83 14.11C16.77 14.01 16.6 13.95 16.34 13.83Z"/>
                              </svg>
                            }
                          </button>
                          <button mat-flat-button color="primary" class="btn-pagar" (click)="abrirModalPago(cuota)">
                            Registrar Pago
                          </button>
                        </div>
                      } @else {
                        <span class="pagada-check"><mat-icon>check_circle</mat-icon> {{ cuota.fecha_pago | date:'dd/MM/yyyy' }}</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="empty-state">No se encontraron cuotas para este crédito.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header-container {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .page-title { margin: 0; color: #1e293b; font-weight: 700; font-size: 1.4rem; flex: 1; }
    .btn-eliminar { margin-left: auto; }

    .loading-shade { display: flex; justify-content: center; padding: 80px 0; }

    /* ============== Tarjeta Resumen ============== */
    .summary-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 28px 32px;
    }
    .summary-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-identity {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cliente-nombre {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .cliente-telefono, .producto-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: #64748b;
    }
    .cliente-telefono mat-icon, .producto-chip mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }

    .estado-badge {
      padding: 8px 18px;
      border-radius: 999px;
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .estado-badge.activo { background: #dbeafe; color: #1d4ed8; }
    .estado-badge.moroso { background: #fee2e2; color: #b91c1c; }
    .estado-badge.liquidado { background: #dcfce7; color: #15803d; }
    .estado-badge.cancelado { background: #f1f5f9; color: #475569; }

    .summary-figures {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 20px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .figure {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .figure-label { font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .figure-value { font-size: 1.3rem; font-weight: 700; color: #1e293b; }
    .figure-value.capitalize { text-transform: capitalize; font-size: 1.05rem; }
    .figure-success { color: #15803d; }
    .figure-destacada {
      background: #f0f9ff;
      border-radius: 10px;
      padding: 8px 14px;
      margin: -8px -14px;
    }
    .figure-saldo { font-size: 1.6rem; font-weight: 800; color: #0369a1; }
    .figure-saldo.figure-danger { color: #b91c1c; }

    .progress-section { margin-top: 20px; }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
    }

    /* ============== Tarjeta Cuotas ============== */
    .cuotas-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 24px 0;
    }
    .cuotas-title {
      margin: 0 0 16px;
      padding: 0 32px;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
    }
    .table-wrapper { overflow-x: auto; }
    .cuotas-table {
      width: 100%;
      border-collapse: collapse;
    }
    .cuotas-table th {
      text-align: left;
      padding: 10px 16px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #94a3b8;
      border-bottom: 2px solid #e2e8f0;
    }
    .cuotas-table td {
      padding: 14px 16px;
      font-size: 0.95rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }
    .cuotas-table td:first-child, .cuotas-table th:first-child { padding-left: 32px; }
    .cuotas-table td:last-child, .cuotas-table th:last-child { padding-right: 32px; }
    .col-numero { font-weight: 700; color: #64748b; }
    .col-accion { text-align: right; }

    /* Colores semánticos por fila, según estado de la cuota */
    tr.fila-pagada { background: #f0fdf4; }
    tr.fila-pendiente { background: #ffffff; }
    tr.fila-parcial { background: #fefce8; }
    tr.fila-vencida { background: #fef2f2; }

    .monto { font-weight: 700; display: block; }
    .saldo-parcial { font-size: 0.8rem; color: #a16207; font-weight: 600; }

    .cuota-estado-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .cuota-estado-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .cuota-estado-badge.pagada { background: #dcfce7; color: #15803d; }
    .cuota-estado-badge.pendiente { background: #f1f5f9; color: #64748b; }
    .cuota-estado-badge.parcial { background: #fef9c3; color: #a16207; }
    .cuota-estado-badge.vencida { background: #fee2e2; color: #b91c1c; }

    .acciones-cuota {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-whatsapp {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border: none;
      border-radius: 50%;
      background: #25d366;
      color: white;
      cursor: pointer;
      transition: transform 0.12s ease, opacity 0.12s ease;
    }
    .btn-whatsapp:hover:not(:disabled) { transform: scale(1.08); }
    .btn-whatsapp:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-whatsapp .spin { animation: spin 1s linear infinite; font-size: 18px; width: 18px; height: 18px; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .btn-pagar { font-size: 0.85rem; }
    .pagada-check {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #15803d;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .pagada-check mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .empty-state { text-align: center; padding: 32px; color: #64748b; }

    @media (max-width: 700px) {
      .summary-figures { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class CreditoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private creditosService = inject(CreditosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  creditoId!: number;
  credito = signal<Credito | null>(null);
  isLoading = signal<boolean>(true);
  enviandoRecordatorio = signal<Set<number>>(new Set());

  // Computed signals para progreso
  cuotasPagadas = computed(() => {
    const cred = this.credito();
    if (!cred || !cred.cuotas) return 0;
    return cred.cuotas.filter(c => c.estado === 'pagada').length;
  });

  porcentajeProgreso = computed(() => {
    const cred = this.credito();
    if (!cred) return 0;
    return (this.cuotasPagadas() / cred.cantidad_cuotas) * 100;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.creditoId = +id;
        this.cargarDatos();
      }
    });
  }

  cargarDatos() {
    this.isLoading.set(true);
    this.creditosService.obtenerDetalle(this.creditoId).subscribe({
      next: (res) => {
        this.credito.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al cargar el detalle del crédito', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  estaEnviandoRecordatorio(cuotaId: number): boolean {
    return this.enviandoRecordatorio().has(cuotaId);
  }

  enviarRecordatorio(cuota: Cuota) {
    if (this.estaEnviandoRecordatorio(cuota.id)) return;

    this.enviandoRecordatorio.update(actual => new Set(actual).add(cuota.id));

    this.creditosService.enviarRecordatorio(cuota.id).subscribe({
      next: (res) => {
        this.snackBar.open(`Mensaje enviado a ${res.data.telefono}`, 'Cerrar', { duration: 4000 });
        this.enviandoRecordatorio.update(actual => {
          const nuevo = new Set(actual);
          nuevo.delete(cuota.id);
          return nuevo;
        });
        this.cargarDatos();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(err.error?.error || 'Error al enviar el recordatorio por WhatsApp', 'Cerrar', { duration: 5000 });
        this.enviandoRecordatorio.update(actual => {
          const nuevo = new Set(actual);
          nuevo.delete(cuota.id);
          return nuevo;
        });
      }
    });
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      activo: 'Activo',
      moroso: 'Moroso',
      liquidado: 'Liquidado',
      cancelado: 'Cancelado',
      pendiente: 'Pendiente',
      pagada: 'Pagada',
      parcial: 'Pago Parcial',
      vencida: 'Vencida'
    };
    return labels[estado] || estado;
  }

  estadoIcono(estado: string): string {
    const iconos: Record<string, string> = {
      pagada: 'check_circle',
      pendiente: 'schedule',
      parcial: 'hourglass_bottom',
      vencida: 'error'
    };
    return iconos[estado] || 'circle';
  }

  abrirModalPago(cuota: Cuota) {
    const dialogRef = this.dialog.open(NuevaCuotaDialogComponent, {
      width: '450px',
      data: { creditoId: this.creditoId, cuota },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((resultado: ResultadoPagoCuota | undefined) => {
      if (!resultado) return;

      // El estado del crédito (badge, progreso, cuotas) lo recarga el backend:
      // es la fuente de verdad, evita duplicar acá la lógica de moroso/liquidado.
      this.cargarDatos();

      if (resultado.creditoLiquidado) {
        this.snackBar.open('¡Crédito liquidado en su totalidad!', 'Cerrar', { duration: 4000 });
      } else if (resultado.creditoReactivado) {
        this.snackBar.open('El crédito ya no tiene cuotas vencidas: vuelve a estar activo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  volver() {
    this.router.navigate(['/admin/creditos']);
  }

  eliminarCredito() {
    const cred = this.credito();
    if (!cred) return;

    const confirmado = confirm(
      `¿Estás seguro? Esto borrará el crédito de ${cred.cliente_nombre || 'este cliente'} y todas sus cuotas. Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    this.creditosService.eliminar(cred.id).subscribe({
      next: () => {
        this.snackBar.open('Crédito eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/admin/creditos']);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(err.error?.error || 'Error al eliminar el crédito', 'Cerrar', { duration: 5000 });
      }
    });
  }
}
