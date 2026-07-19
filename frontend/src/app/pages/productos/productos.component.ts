import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ProductosService, Producto } from '../../services/productos.service';
import { ProductoFormComponent } from './producto-form/producto-form.component';
import { EtiquetaProductoDialogComponent } from './etiqueta-producto-dialog/etiqueta-producto-dialog.component';
import { ImportarErroresDialogComponent } from './importar-errores-dialog/importar-errores-dialog.component';

@Component({
  selector: 'app-productos',
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
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <h2 class="page-title">Gestión de Productos</h2>
        <div class="header-acciones">
          <button mat-stroked-button (click)="descargarPlantilla()" matTooltip="Descargar plantilla .xlsx con las columnas esperadas">
            <mat-icon>download</mat-icon> Plantilla
          </button>
          <button mat-stroked-button (click)="archivoInput.click()" [disabled]="importando()">
            <mat-icon>upload_file</mat-icon> {{ importando() ? 'Importando...' : 'Importar Excel' }}
          </button>
          <input #archivoInput type="file" accept=".xlsx" hidden (change)="onArchivoSeleccionado($event)">
          <button mat-flat-button color="primary" class="btn-nuevo" (click)="abrirModalForm()">
            <mat-icon>add</mat-icon> Nuevo Producto
          </button>
        </div>
      </div>

      <div class="filters-container">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar por nombre, SKU o código de barras...</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" style="color: white !important;">
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

        <table mat-table [dataSource]="productos()">

          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef> Producto </th>
            <td mat-cell *matCellDef="let p">
              <div class="fw-500">{{ p.nombre }}</div>
              <div class="muted">{{ p.sku || 'Sin SKU' }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="precio">
            <th mat-header-cell *matHeaderCellDef> Precio </th>
            <td mat-cell *matCellDef="let p"> {{ p.precio | currency:'ARS' }} </td>
          </ng-container>

          <ng-container matColumnDef="stock">
            <th mat-header-cell *matHeaderCellDef> Stock </th>
            <td mat-cell *matCellDef="let p">
              <span class="stock-badge" [class.low]="p.stock <= 5">{{ p.stock }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="activo">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let p">
              <span class="estado-badge" [class.activo]="p.activo" [class.inactivo]="!p.activo">
                {{ p.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="actions-col"> Acciones </th>
            <td mat-cell *matCellDef="let p" class="actions-col">
              <button mat-icon-button (click)="imprimirEtiqueta(p)" matTooltip="Imprimir etiqueta con código de barras">
                <mat-icon>sell</mat-icon>
              </button>
              <button mat-icon-button class="text-accent" (click)="abrirModalForm(p)" matTooltip="Editar producto">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminar(p)" matTooltip="Eliminar producto">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-state" colspan="5">
              <div class="empty-content">
                <mat-icon class="empty-icon">inventory_2</mat-icon>
                @if (searchControl.value) {
                  <p>No se encontraron productos que coincidan con "<strong>{{ searchControl.value }}</strong>"</p>
                } @else {
                  <p>No hay productos cargados aún.</p>
                  <button mat-stroked-button color="primary" (click)="abrirModalForm()">Cargar el primero</button>
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
    .header-acciones { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filters-container { display: flex; margin-top: 8px; }
    .search-field { width: 100%; max-width: 450px; }
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
    .table-container { position: relative; background: white; border-radius: 8px; overflow-x: auto; overflow-y: hidden; }
    .loading-shade {
      position: absolute; top: 0; left: 0; bottom: 0; right: 0;
      background: rgba(255, 255, 255, 0.6);
      z-index: 10; display: flex; align-items: center; justify-content: center;
    }
    table { width: 100%; }
    .fw-500 { font-weight: 500; }
    .muted { font-size: 0.8rem; color: #64748b; }
    .actions-col { width: 160px; text-align: right; }
    .hover-row:hover { background-color: #f8fafc; }
    .text-accent { color: #0ea5e9; }
    .stock-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-weight: 600;
      background: #dcfce7;
      color: #16a34a;
    }
    .stock-badge.low { background: #fee2e2; color: #dc2626; }
    .estado-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .estado-badge.activo { background: #dbeafe; color: #2563eb; }
    .estado-badge.inactivo { background: #f1f5f9; color: #64748b; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; }
    .empty-icon { font-size: 48px; height: 48px; width: 48px; color: #cbd5e1; }
  `]
})
export class ProductosComponent implements OnInit {
  private productosService = inject(ProductosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['nombre', 'precio', 'stock', 'activo', 'acciones'];

  productos = signal<Producto[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  isLoading = signal<boolean>(false);
  importando = signal<boolean>(false);

  searchControl = new FormControl('');

  constructor() {
    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex.set(0);
      this.cargarDatos();
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading.set(true);
    const searchVal = this.searchControl.value || '';

    this.productosService.listar(this.pageIndex() + 1, this.pageSize(), searchVal).subscribe({
      next: (res) => {
        this.productos.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error de conexión al cargar productos', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarDatos();
  }

  abrirModalForm(producto?: Producto) {
    const dialogRef = this.dialog.open(ProductoFormComponent, {
      width: '550px',
      data: { producto },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.cargarDatos();
      }
    });
  }

  imprimirEtiqueta(producto: Producto) {
    this.dialog.open(EtiquetaProductoDialogComponent, {
      width: '380px',
      data: { producto }
    });
  }

  descargarPlantilla() {
    this.productosService.descargarPlantillaImportacion().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-productos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al descargar la plantilla', 'Cerrar', { duration: 4000 });
      }
    });
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo si se corrige y reintenta
    if (!archivo) return;

    this.importando.set(true);
    this.productosService.importarExcel(archivo).subscribe({
      next: (res) => {
        this.importando.set(false);
        this.snackBar.open(`Se importaron ${res.data.creados} producto(s) correctamente`, 'Cerrar', { duration: 5000 });
        this.cargarDatos();
      },
      error: (err) => {
        this.importando.set(false);
        this.dialog.open(ImportarErroresDialogComponent, {
          width: '500px',
          data: {
            mensaje: err?.error?.error || 'No se pudo importar el archivo',
            errores: err?.error?.errores
          }
        });
      }
    });
  }

  eliminar(producto: Producto) {
    if (confirm(`¿Estás seguro que deseas eliminar "${producto.nombre}"? Esta acción es irreversible.`)) {
      this.isLoading.set(true);
      this.productosService.eliminar(producto.id).subscribe({
        next: () => {
          this.snackBar.open('Producto eliminado exitosamente', 'Cerrar', { duration: 3000 });
          if (this.productos().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.set(this.pageIndex() - 1);
          }
          this.cargarDatos();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error al eliminar producto. Puede tener pedidos asociados.', 'Cerrar', { duration: 5000 });
          this.isLoading.set(false);
        }
      });
    }
  }
}
