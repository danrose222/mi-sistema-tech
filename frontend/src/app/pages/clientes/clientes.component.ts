import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClientesService, Cliente } from '../../services/clientes.service';
import { ClienteFormComponent } from './cliente-form/cliente-form.component';
import { ClienteDetalleComponent } from './cliente-detalle/cliente-detalle.component';

@Component({
  selector: 'app-clientes',
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
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <h2 class="page-title">Gestión de Clientes</h2>
        <button mat-flat-button color="primary" class="btn-nuevo" (click)="abrirModalForm()">
          <mat-icon>add</mat-icon> Nuevo Cliente
        </button>
      </div>

      <div class="filters-container">
        <mat-form-field appearance="outline" class="search-field" floatLabel="always">
          <mat-label>Buscar cliente...</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" placeholder="Escribí nombre, email o teléfono" style="color: white !important;">
          @if (searchControl.value) {
            <button matSuffix mat-icon-button (click)="searchControl.setValue('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
      </div>

      <div class="table-container mat-elevation-z2">
        @if (isLoading()) {
          <div class="loading-shade">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
        }

        <table mat-table [dataSource]="clientes()">
          
          <!-- Nombre Column -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef> Nombre </th>
            <td mat-cell *matCellDef="let element" class="fw-500">
              {{element.nombre}}
              @if (element.historial_crediticio === 'Bueno' || element.historial_crediticio === 'Excelente') {
                <span class="badge-historial" [class.excelente]="element.historial_crediticio === 'Excelente'" matTooltip="Historial crediticio: {{element.historial_crediticio}}">
                  <mat-icon>verified</mat-icon> Cliente Cumplidor
                </span>
              }
            </td>
          </ng-container>

          <!-- Telefono Column -->
          <ng-container matColumnDef="telefono">
            <th mat-header-cell *matHeaderCellDef> Teléfono </th>
            <td mat-cell *matCellDef="let element"> {{element.telefono || '-'}} </td>
          </ng-container>

          <!-- Email Column -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef> Email </th>
            <td mat-cell *matCellDef="let element"> {{element.email || '-'}} </td>
          </ng-container>

          <!-- Acciones Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="actions-col"> Acciones </th>
            <td mat-cell *matCellDef="let element" class="actions-col">
              <button mat-icon-button color="primary" (click)="abrirModalDetalle(element.id)" matTooltip="Ver detalle completo">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button class="text-accent" (click)="abrirModalForm(element)" matTooltip="Editar datos">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminar(element)" matTooltip="Eliminar cliente">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-row"></tr>
          
          <!-- Fila mostrada cuando no hay datos -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-state" colspan="4">
              <div class="empty-content">
                <mat-icon class="empty-icon">group_off</mat-icon>
                @if (searchControl.value) {
                  <p>No se encontraron clientes que coincidan con "<strong>{{searchControl.value}}</strong>"</p>
                } @else {
                  <p>No hay clientes registrados en el sistema aún.</p>
                  <button mat-stroked-button color="primary" (click)="abrirModalForm()">Registrar el primero</button>
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
    .filters-container {
      display: flex;
      margin-top: 8px;
    }
    .search-field {
      width: 100%;
      max-width: 450px;
    }
    /* El buscador vive sobre el fondo oscuro de la página (--void), no dentro
       de una tarjeta blanca. El tema Material por defecto pinta el texto del
       input en color oscuro -> texto casi invisible. Se fuerza alto contraste. */
    .search-field ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: var(--slate);
      border-radius: var(--radius-sm);
    }
    .search-field ::ng-deep input.mat-mdc-input-element {
      color: var(--white) !important;
      caret-color: var(--white);
    }
    .search-field ::ng-deep input.mat-mdc-input-element::placeholder {
      color: var(--ash) !important;
      opacity: 1;
    }
    .search-field ::ng-deep .mat-mdc-floating-label {
      color: var(--ash) !important;
    }
    .search-field ::ng-deep .mat-mdc-form-field-icon-prefix > .mat-icon,
    .search-field ::ng-deep .mat-mdc-form-field-icon-suffix > .mat-icon {
      color: var(--ash);
    }
    .search-field ::ng-deep .mdc-notched-outline__leading,
    .search-field ::ng-deep .mdc-notched-outline__notch,
    .search-field ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--border-dim) !important;
    }
    .search-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    .search-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    .search-field ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--signal) !important;
      border-width: 2px;
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
    table {
      width: 100%;
    }
    .fw-500 {
      font-weight: 500;
    }
    .badge-historial {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 700;
      vertical-align: middle;
      background: #dcfce7;
      color: #15803d;
    }
    .badge-historial.excelente {
      background: #fef9c3;
      color: #a16207;
    }
    .badge-historial mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .actions-col {
      width: 160px;
      text-align: right;
    }
    .hover-row:hover {
      background-color: #f8fafc;
    }
    .text-accent {
      color: #0ea5e9;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }
    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
    }
    .empty-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #cbd5e1;
    }
  `]
})
export class ClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['nombre', 'telefono', 'email', 'acciones'];
  
  // Estado mediante Signals
  clientes = signal<Cliente[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  isLoading = signal<boolean>(false);

  // Control para la búsqueda con reactividad
  searchControl = new FormControl('');

  constructor() {
    // Reaccionar a cambios en el input de búsqueda (debounce evita saturar la API)
    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex.set(0); // Volver a la primera página al buscar
      this.cargarDatos();
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading.set(true);
    const searchVal = this.searchControl.value || '';
    
    // Backend espera paginación base 1
    this.clientesService.listar(this.pageIndex() + 1, this.pageSize(), searchVal).subscribe({
      next: (res) => {
        this.clientes.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error de conexión al cargar clientes', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarDatos();
  }

  abrirModalForm(cliente?: Cliente) {
    const dialogRef = this.dialog.open(ClienteFormComponent, {
      width: '550px',
      data: { cliente },
      disableClose: true // Evita cerrar tocando afuera por accidente
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.cargarDatos(); // Refrescar tabla si se guardaron datos
      }
    });
  }

  abrirModalDetalle(id: number) {
    this.dialog.open(ClienteDetalleComponent, {
      width: '650px',
      data: { clienteId: id }
    });
  }

  eliminar(cliente: Cliente) {
    if (confirm(`¿Estás seguro que deseas eliminar a ${cliente.nombre}? Esta acción es irreversible.`)) {
      this.isLoading.set(true);
      this.clientesService.eliminar(cliente.id).subscribe({
        next: () => {
          this.snackBar.open('Cliente eliminado exitosamente', 'Cerrar', { duration: 3000 });
          // Si era el último de la página y no es la pág 1, retroceder
          if (this.clientes().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.set(this.pageIndex() - 1);
          }
          this.cargarDatos();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error al eliminar cliente. Puede tener pedidos asociados.', 'Cerrar', { duration: 5000 });
          this.isLoading.set(false);
        }
      });
    }
  }
}
