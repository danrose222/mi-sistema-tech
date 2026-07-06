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
import { MatBadgeModule } from '@angular/material/badge';

import { CreditosService, Credito, Cuota } from '../../../services/creditos.service';
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
    MatBadgeModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <div class="title-group">
          <button mat-icon-button (click)="volver()" aria-label="Volver">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2 class="page-title">Detalle de Crédito #{{ creditoId }}</h2>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-shade">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else if (credito()) {
        <div class="dashboard-grid">
          
          <!-- Columna Izquierda: Info General -->
          <div class="col-left">
            <mat-card class="info-card mat-elevation-z2">
              <mat-card-header>
                <mat-card-title>Información General</mat-card-title>
                <mat-card-subtitle>
                  <span class="badge mt-1" [ngClass]="credito()!.estado">{{ credito()!.estado | uppercase }}</span>
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="info-list">
                  <div class="info-item">
                    <span class="label">Cliente:</span>
                    <span class="value fw-600">{{ credito()!.cliente_nombre }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Monto Total:</span>
                    <span class="value">{{ credito()!.monto_total | currency:'ARS' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Frecuencia:</span>
                    <span class="value capitalize">{{ credito()!.frecuencia }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Fecha Alta:</span>
                    <span class="value">{{ credito()!.created_at | date:'mediumDate' }}</span>
                  </div>
                  @if(credito()!.notas) {
                    <div class="info-item mt-2">
                      <span class="label">Notas:</span>
                      <span class="value italic">{{ credito()!.notas }}</span>
                    </div>
                  }
                </div>

                <div class="progress-section">
                  <div class="progress-labels">
                    <span>Progreso de Pagos</span>
                    <span>{{ cuotasPagadas() }} / {{ credito()!.cantidad_cuotas }} pagadas</span>
                  </div>
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="porcentajeProgreso()"
                    [color]="credito()!.estado === 'moroso' ? 'warn' : (porcentajeProgreso() === 100 ? 'primary' : 'accent')">
                  </mat-progress-bar>
                  <div class="progress-subtitle">
                    {{ porcentajeProgreso() | number:'1.0-0' }}% completado
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Columna Derecha: Cuotas -->
          <div class="col-right">
            <mat-card class="cuotas-card mat-elevation-z2">
              <mat-card-header>
                <mat-card-title>Plan de Cuotas</mat-card-title>
              </mat-card-header>
              <mat-card-content class="no-padding">
                <div class="cuotas-list">
                  @for (cuota of credito()!.cuotas; track cuota.id) {
                    <div class="cuota-item" [ngClass]="{'is-morosa': cuota.estado === 'vencida'}">
                      <div class="cuota-info">
                        <div class="cuota-num">#{{ cuota.numero_cuota }}</div>
                        <div class="cuota-details">
                          <span class="cuota-amount">{{ cuota.monto | currency:'ARS' }}</span>
                          <span class="cuota-date" [ngClass]="{'text-warn': cuota.estado === 'vencida'}">
                            Vencimiento: {{ cuota.fecha_vencimiento | date:'mediumDate' }}
                          </span>
                          @if (cuota.saldo_pendiente < cuota.monto && cuota.estado !== 'pagada') {
                            <span class="cuota-saldo">Saldo restante: {{ cuota.saldo_pendiente | currency:'ARS' }}</span>
                          }
                        </div>
                      </div>
                      
                      <div class="cuota-status">
                        <span class="status-dot" [ngClass]="cuota.estado"></span>
                        <span class="status-text capitalize" [ngClass]="cuota.estado">{{ cuota.estado }}</span>
                        
                        @if (cuota.estado === 'pendiente' || cuota.estado === 'vencida') {
                          <button mat-stroked-button color="primary" class="btn-pay" (click)="abrirModalPago(cuota)">
                            Registrar Pago
                          </button>
                        } @else if (cuota.estado === 'pagada') {
                          <mat-icon class="check-icon" matTooltip="Cuota pagada el {{ cuota.fecha_pago | date:'mediumDate' }}">check_circle</mat-icon>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">No se encontraron cuotas para este crédito.</div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
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
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .page-title { margin: 0; color: #1e293b; font-weight: 600; font-size: 1.25rem; }
    
    .loading-shade {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 24px;
      align-items: start;
    }
    
    /* Info Card */
    .info-card { border-radius: 12px; }
    .cuotas-card { border-radius: 12px; }
    .info-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .label { font-size: 0.85rem; color: #64748b; }
    .value { font-size: 1.05rem; color: #1e293b; }
    .fw-600 { font-weight: 600; }
    .capitalize { text-transform: capitalize; }
    .italic { font-style: italic; color: #475569; font-size: 0.95rem; background: #f8fafc; padding: 8px; border-radius: 6px;}
    .mt-1 { display: inline-block; margin-top: 4px; }
    .mt-2 { margin-top: 8px; }

    .progress-section {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-weight: 500;
      color: #334155;
    }
    .progress-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 4px;
      text-align: right;
    }

    /* Badges */
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
    .badge.activo { background: #e0f2fe; color: #0284c7; }
    .badge.moroso { background: #fee2e2; color: #b91c1c; }
    .badge.liquidado { background: #dcfce3; color: #15803d; }
    .badge.cancelado { background: #f1f5f9; color: #475569; }

    /* Cuotas */
    .no-padding { padding: 0 !important; }
    .cuotas-list {
      display: flex;
      flex-direction: column;
    }
    .cuota-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s;
    }
    .cuota-item:hover { background-color: #f8fafc; }
    .cuota-item:last-child { border-bottom: none; }
    .cuota-item.is-morosa { background-color: #fff1f2; }
    
    .cuota-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .cuota-num {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 1.1rem;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .cuota-details {
      display: flex;
      flex-direction: column;
    }
    .cuota-amount { font-weight: 700; font-size: 1.1rem; color: #0f172a; }
    .cuota-date { font-size: 0.85rem; color: #64748b; }
    .cuota-saldo { font-size: 0.85rem; color: #0ea5e9; font-weight: 500; }
    .text-warn { color: #dc2626 !important; font-weight: 500; }

    .cuota-status {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 220px;
      justify-content: flex-end;
    }
    .status-dot {
      width: 10px; height: 10px; border-radius: 50%;
    }
    .status-dot.pendiente { background: #cbd5e1; }
    .status-dot.pagada { background: #22c55e; }
    .status-dot.vencida { background: #ef4444; }
    
    .status-text { font-weight: 600; font-size: 0.9rem; }
    .status-text.pendiente { color: #64748b; }
    .status-text.pagada { color: #16a34a; }
    .status-text.vencida { color: #dc2626; }

    .btn-pay { margin-left: 12px; }
    .check-icon { color: #22c55e; margin-left: 12px; font-size: 28px; width: 28px; height: 28px; }
    
    .empty-state {
      padding: 32px;
      text-align: center;
      color: #64748b;
    }

    @media (max-width: 950px) {
      .dashboard-grid { grid-template-columns: 1fr; }
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

  abrirModalPago(cuota: Cuota) {
    const dialogRef = this.dialog.open(NuevaCuotaDialogComponent, {
      width: '450px',
      data: { creditoId: this.creditoId, cuota },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarDatos(); // Recargar todo el detalle
      }
    });
  }

  volver() {
    this.router.navigate(['/admin/creditos']);
  }
}
