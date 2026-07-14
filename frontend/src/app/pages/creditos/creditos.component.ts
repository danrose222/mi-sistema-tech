import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CreditosService, Credito } from '../../services/creditos.service';

@Component({
  selector: 'app-creditos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <h2 class="page-title">Gestión de Créditos</h2>
        <button mat-flat-button color="primary" (click)="nuevoCredito()">
          <mat-icon>add</mat-icon> Nuevo Crédito
        </button>
      </div>

      <div class="status-filters">
        @for (opcion of filtrosEstado; track opcion.valor) {
          <button
            type="button"
            class="filter-pill"
            [ngClass]="'pill-' + opcion.valor"
            [class.active]="filtroEstado() === opcion.valor"
            (click)="setFiltro(opcion.valor)">
            <mat-icon>{{ opcion.icono }}</mat-icon>
            {{ opcion.label }}
          </button>
        }
      </div>

      <div class="table-container mat-elevation-z2">
        @if (isLoading()) {
          <div class="loading-shade">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
        }

        <table mat-table [dataSource]="creditos()">
          
          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef> Cliente </th>
            <td mat-cell *matCellDef="let element" class="fw-500"> {{element.cliente_nombre || 'Cliente #'+element.cliente_id}} </td>
          </ng-container>

          <ng-container matColumnDef="monto">
            <th mat-header-cell *matHeaderCellDef> Monto Total </th>
            <td mat-cell *matCellDef="let element"> {{element.monto_total | currency:'ARS':'symbol':'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="cuotas">
            <th mat-header-cell *matHeaderCellDef> Cuotas </th>
            <td mat-cell *matCellDef="let element"> 
              {{element.cantidad_cuotas}} 
              <span class="muted">({{element.frecuencia}})</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let element"> 
              <span class="badge" [ngClass]="element.estado">
                {{element.estado | uppercase}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="actions-col"> Acciones </th>
            <td mat-cell *matCellDef="let element" class="actions-col">
              <button mat-icon-button color="primary" (click)="verDetalle(element.id)" matTooltip="Ver Cuotas">
                <mat-icon [matBadge]="element.estado === 'moroso' ? '!' : ''" matBadgeColor="warn" [matBadgeHidden]="element.estado !== 'moroso'">
                  visibility
                </mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminar(element)" matTooltip="Eliminar crédito">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-row"></tr>
          
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-state" colspan="5">
              <div class="empty-content">
                <mat-icon class="empty-icon">account_balance_wallet</mat-icon>
                <p>No se encontraron créditos con estos filtros.</p>
              </div>
            </td>
          </tr>
        </table>

        <mat-paginator 
          [length]="totalItems()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPageChange($event)"
          aria-label="Seleccionar página">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .page-title {
      margin: 0;
      color: #1e293b;
      font-weight: 600;
    }
    .status-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      background: white;
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .filter-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 2px solid transparent;
      border-radius: 999px;
      padding: 8px 18px;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      background: #f1f5f9;
      color: #64748b;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
    }
    .filter-pill mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .filter-pill:hover {
      transform: translateY(-1px);
    }

    /* Todos: neutro */
    .pill-todos.active {
      background: #e2e8f0;
      color: #334155;
      border-color: #94a3b8;
    }

    /* Activos: transmite normalidad */
    .pill-activo.active {
      background: #dbeafe;
      color: #1d4ed8;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    /* Liquidados: éxito */
    .pill-liquidado.active {
      background: #dcfce7;
      color: #15803d;
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
    }

    /* Morosos: debe destacar fuertemente */
    .pill-moroso.active {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
    }
    .table-container {
      position: relative;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    .loading-shade {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.6);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    table { width: 100%; }
    .fw-500 { font-weight: 500; }
    .muted { color: #64748b; font-size: 0.85em; }
    .actions-col { width: 100px; text-align: right; }
    .hover-row:hover { background-color: #f8fafc; cursor: pointer; }
    
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge.activo { background: #e0f2fe; color: #0284c7; }
    .badge.moroso { background: #fee2e2; color: #b91c1c; }
    .badge.liquidado { background: #dcfce3; color: #15803d; }
    .badge.cancelado { background: #f1f5f9; color: #475569; }

    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; }
    .empty-icon { font-size: 48px; height: 48px; width: 48px; color: #cbd5e1; }
  `]
})
export class CreditosComponent implements OnInit {
  private creditosService = inject(CreditosService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['cliente', 'monto', 'cuotas', 'estado', 'acciones'];
  
  creditos = signal<Credito[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  isLoading = signal<boolean>(false);
  
  filtroEstado = signal<string>('todos');

  filtrosEstado = [
    { valor: 'todos', label: 'Todos', icono: 'apps' },
    { valor: 'activo', label: 'Activos', icono: 'check_circle' },
    { valor: 'moroso', label: 'Morosos', icono: 'warning' },
    { valor: 'liquidado', label: 'Liquidados', icono: 'task_alt' }
  ];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading.set(true);
    
    this.creditosService.listar(this.pageIndex() + 1, this.pageSize(), this.filtroEstado()).subscribe({
      next: (res) => {
        this.creditos.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al cargar créditos', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  setFiltro(estado: string) {
    if (this.filtroEstado() === estado) return;
    this.filtroEstado.set(estado);
    this.pageIndex.set(0);
    this.cargarDatos();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarDatos();
  }

  nuevoCredito() {
    this.router.navigate(['/admin/creditos/nuevo']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/admin/creditos', id]);
  }

  eliminar(credito: Credito) {
    const confirmado = confirm(
      `¿Estás seguro? Esto borrará el crédito de ${credito.cliente_nombre || 'este cliente'} y todas sus cuotas. Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    this.isLoading.set(true);
    this.creditosService.eliminar(credito.id).subscribe({
      next: () => {
        this.snackBar.open('Crédito eliminado exitosamente', 'Cerrar', { duration: 3000 });
        if (this.creditos().length === 1 && this.pageIndex() > 0) {
          this.pageIndex.set(this.pageIndex() - 1);
        }
        this.cargarDatos();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(err.error?.error || 'Error al eliminar el crédito', 'Cerrar', { duration: 5000 });
        this.isLoading.set(false);
      }
    });
  }
}
