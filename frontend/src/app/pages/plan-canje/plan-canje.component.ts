import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PlanCanjeService, PlanCanje } from '../../services/plan-canje.service';
import { PlanCanjeFormComponent } from './plan-canje-form/plan-canje-form.component';

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente_revision: 'Pendiente de revisión',
  tasado: 'Tasado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  completado: 'Completado'
};

@Component({
  selector: 'app-plan-canje',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <h2 class="page-title">Plan Canje</h2>
        <button mat-flat-button color="primary" class="btn-nuevo" (click)="abrirModalForm()">
          <mat-icon>add</mat-icon> Nuevo Ingreso
        </button>
      </div>

      <div class="filters-container">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filtrar por estado</mat-label>
          <mat-select [(value)]="estadoFiltro" (selectionChange)="onFiltroChange()" panelClass="plan-canje-estado-filtro-panel">
            <mat-option value="">Todos</mat-option>
            <mat-option value="pendiente_revision">Pendiente de revisión</mat-option>
            <mat-option value="tasado">Tasado</mat-option>
            <mat-option value="aceptado">Aceptado</mat-option>
            <mat-option value="rechazado">Rechazado</mat-option>
            <mat-option value="completado">Completado</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="table-container mat-elevation-z2">
        @if (isLoading()) {
          <div class="loading-shade">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
        }

        <table mat-table [dataSource]="operaciones()">

          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef> Cliente </th>
            <td mat-cell *matCellDef="let op" class="fw-500">
              {{ op.cliente_nombre }}
              <div class="subtexto">{{ op.cliente_telefono }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="equipo">
            <th mat-header-cell *matHeaderCellDef> Equipo recibido </th>
            <td mat-cell *matCellDef="let op">
              {{ op.equipo_marca }} {{ op.equipo_modelo }}
              @if (op.equipo_capacidad) {
                <div class="subtexto">{{ op.equipo_capacidad }} · {{ etiquetaCondicion(op.equipo_estado_general) }}</div>
              } @else {
                <div class="subtexto">{{ etiquetaCondicion(op.equipo_estado_general) }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="valor_tasado">
            <th mat-header-cell *matHeaderCellDef> Valor Tasado </th>
            <td mat-cell *matCellDef="let op">
              {{ op.valor_tasado !== null ? (op.valor_tasado | currency:'ARS') : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let op">
              <span class="badge" [class]="'estado-' + op.estado">{{ etiquetaEstado(op.estado) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef> Fecha </th>
            <td mat-cell *matCellDef="let op"> {{ op.created_at | date:'dd/MM/yyyy HH:mm' }} </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="actions-col"> Acciones </th>
            <td mat-cell *matCellDef="let op" class="actions-col">
              <button mat-icon-button class="text-accent" (click)="abrirModalForm(op)" matTooltip="Editar operación">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminar(op)" matTooltip="Eliminar operación">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-state" colspan="6">
              <div class="empty-content">
                <mat-icon class="empty-icon">phone_iphone</mat-icon>
                @if (estadoFiltro) {
                  <p>No hay operaciones con estado "{{ etiquetaEstado(estadoFiltro) }}".</p>
                } @else {
                  <p>Todavía no hay operaciones de Plan Canje registradas.</p>
                  <button mat-stroked-button color="primary" (click)="abrirModalForm()">Registrar la primera</button>
                }
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
    .page-container { display: flex; flex-direction: column; gap: 16px; }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .page-title { margin: 0; color: #1e293b; font-weight: 600; }
    .filters-container { display: flex; margin-top: 8px; }
    .filter-field { width: 240px; }
    /* Mismo patrón que el buscador de Clientes/Productos/Pedidos: el select
       vive sobre el fondo oscuro de la página (--void), no dentro de una
       tarjeta blanca. Material pinta el texto con el color oscuro de su tema
       por defecto -> ilegible. Se fuerza alto contraste. */
    .filter-field ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: var(--slate);
      border-radius: var(--radius-sm);
    }
    .filter-field ::ng-deep .mat-mdc-select-value,
    .filter-field ::ng-deep .mat-mdc-select-value-text {
      color: var(--white) !important;
    }
    .filter-field ::ng-deep .mat-mdc-select-arrow {
      color: var(--ash);
    }
    .filter-field ::ng-deep .mat-mdc-floating-label {
      color: var(--ash) !important;
    }
    .filter-field ::ng-deep .mdc-notched-outline__leading,
    .filter-field ::ng-deep .mdc-notched-outline__notch,
    .filter-field ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--border-dim) !important;
    }
    .filter-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    .filter-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    .filter-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--signal) !important;
      border-width: 2px;
    }
    /* El panel desplegable del mat-select se renderiza en un CDK overlay
       adjunto al final del <body>, fuera del árbol DOM de este componente
       -> no es alcanzable con ".filter-field ::ng-deep ...". Por eso se usa
       panelClass="plan-canje-estado-filtro-panel" en el <mat-select> del
       template y se apunta a esa clase con un ::ng-deep sin ancestro (estilo
       global, pero acotado únicamente a este panel gracias a la clase única). */
    ::ng-deep .plan-canje-estado-filtro-panel {
      background-color: var(--slate) !important;
    }
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option .mdc-list-item__primary-text {
      color: var(--white) !important;
    }
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option:hover:not(.mdc-list-item--disabled),
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option.mat-mdc-option-active {
      background-color: rgba(0, 174, 239, 0.12) !important;
    }
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option:hover:not(.mdc-list-item--disabled) .mdc-list-item__primary-text,
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option.mat-mdc-option-active .mdc-list-item__primary-text {
      color: var(--signal) !important;
    }
    ::ng-deep .plan-canje-estado-filtro-panel .mat-mdc-option.mdc-list-item--selected .mdc-list-item__primary-text {
      color: var(--signal) !important;
      font-weight: 600;
    }
    .table-container { position: relative; background: white; border-radius: 8px; overflow-x: auto; overflow-y: hidden; }
    .loading-shade {
      position: absolute; top: 0; left: 0; bottom: 0; right: 0;
      background: rgba(255, 255, 255, 0.6);
      z-index: 10; display: flex; align-items: center; justify-content: center;
    }
    table { width: 100%; }
    .fw-500 { font-weight: 500; }
    .subtexto { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
    .actions-col { width: 120px; text-align: right; }
    .hover-row:hover { background-color: #f8fafc; }
    .text-accent { color: #0ea5e9; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .estado-pendiente_revision { background: #fef3c7; color: #b45309; }
    .estado-tasado { background: #dbeafe; color: #2563eb; }
    .estado-aceptado { background: #dcfce7; color: #16a34a; }
    .estado-rechazado { background: #fee2e2; color: #dc2626; }
    .estado-completado { background: #ede9fe; color: #6d28d9; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; }
    .empty-icon { font-size: 48px; height: 48px; width: 48px; color: #cbd5e1; }
  `]
})
export class PlanCanjeComponent implements OnInit {
  private planCanjeService = inject(PlanCanjeService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['cliente', 'equipo', 'valor_tasado', 'estado', 'fecha', 'acciones'];

  operaciones = signal<PlanCanje[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  isLoading = signal<boolean>(false);

  estadoFiltro = '';

  private readonly etiquetasCondicion: Record<string, string> = {
    excelente: 'Excelente',
    bueno: 'Bueno',
    regular: 'Regular',
    malo: 'Malo'
  };

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading.set(true);

    this.planCanjeService.listar(this.pageIndex() + 1, this.pageSize(), this.estadoFiltro).subscribe({
      next: (res) => {
        this.operaciones.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error de conexión al cargar Plan Canje', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  onFiltroChange() {
    this.pageIndex.set(0);
    this.cargarDatos();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarDatos();
  }

  etiquetaEstado(estado: string): string {
    return ETIQUETAS_ESTADO[estado] || estado;
  }

  etiquetaCondicion(condicion: string): string {
    return this.etiquetasCondicion[condicion] || condicion;
  }

  abrirModalForm(registro?: PlanCanje) {
    const dialogRef = this.dialog.open(PlanCanjeFormComponent, {
      width: '600px',
      data: { registro },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.cargarDatos();
      }
    });
  }

  eliminar(registro: PlanCanje) {
    if (confirm(`¿Estás seguro que deseas eliminar la operación de ${registro.cliente_nombre}? Esta acción es irreversible.`)) {
      this.isLoading.set(true);
      this.planCanjeService.eliminar(registro.id).subscribe({
        next: () => {
          this.snackBar.open('Operación eliminada exitosamente', 'Cerrar', { duration: 3000 });
          if (this.operaciones().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.set(this.pageIndex() - 1);
          }
          this.cargarDatos();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error al eliminar la operación', 'Cerrar', { duration: 5000 });
          this.isLoading.set(false);
        }
      });
    }
  }
}
