import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ProductosService, Producto } from '../../services/productos.service';

interface ItemPresupuesto {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container pantalla-only">
        <h2 class="page-title">Nuevo Presupuesto</h2>
        <button type="button" class="btn-primary" [disabled]="items().length === 0" (click)="imprimir()">
          <mat-icon>print</mat-icon> Imprimir Presupuesto
        </button>
      </div>

      @if (catalogoVacio()) {
        <div class="empty-catalogo-banner pantalla-only">
          <mat-icon>warning</mat-icon>
          <span>No hay productos cargados en el catálogo. Cargá productos desde la sección "Productos" antes de generar un presupuesto.</span>
        </div>
      }

      <div class="datos-cliente pantalla-only">
        <div class="campo">
          <label for="presupuesto-cliente">Nombre del cliente</label>
          <input id="presupuesto-cliente" class="form-input" type="text" placeholder="Opcional"
            [value]="nombreCliente()" (input)="nombreCliente.set(inputValue($event))">
        </div>
        <div class="campo">
          <label for="presupuesto-validez">Validez del presupuesto</label>
          <input id="presupuesto-validez" class="form-input" type="text" placeholder="Ej. 7 días"
            [value]="validez()" (input)="validez.set(inputValue($event))">
        </div>
      </div>

      <div class="buscador-container pantalla-only">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar producto para agregar...</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput type="text" placeholder="Nombre o SKU..." [formControl]="searchControl"
            [matAutocomplete]="auto" [disabled]="catalogoVacio()" style="color: white !important;">
          <mat-autocomplete #auto="matAutocomplete" panelClass="presupuesto-autocomplete-panel"
            (optionSelected)="agregarProducto($event)">
            @for (producto of productosFiltrados(); track producto.id) {
              <mat-option [value]="producto">
                {{ producto.nombre }} <span class="muted-text">({{ producto.precio | currency:'ARS':'symbol':'1.0-0' }} · stock: {{ producto.stock }})</span>
              </mat-option>
            }
            @if (mostrarSinResultados()) {
              <mat-option disabled>No se encontraron productos con ese nombre</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      </div>

      <!-- Encabezado exclusivo de impresión: oculto en pantalla, visible solo al imprimir -->
      <header class="print-header">
        <h1>Cel Shop Center</h1>
        <p class="print-address">Dean Funes 463, Capilla del Monte, Córdoba</p>
        <div class="print-meta">
          <span>Fecha de emisión: {{ fechaEmision | date:'dd/MM/yyyy' }}</span>
          @if (validez()) {
            <span>Validez: {{ validez() }}</span>
          }
        </div>
        @if (nombreCliente()) {
          <p class="print-cliente">Cliente: {{ nombreCliente() }}</p>
        }
      </header>

      <div class="tabla-container">
        <table class="presupuesto-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="col-cantidad">Cantidad</th>
              <th class="col-precio">Precio Unitario</th>
              <th class="col-subtotal">Subtotal</th>
              <th class="col-accion pantalla-only">Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.productoId) {
              <tr>
                <td>{{ item.nombre }}</td>
                <td class="col-cantidad">
                  <input class="cantidad-input pantalla-only" type="number" min="1" [value]="item.cantidad"
                    (change)="actualizarCantidad(item.productoId, inputValue($event))">
                  <span class="impresion-only">{{ item.cantidad }}</span>
                </td>
                <td class="col-precio">{{ item.precioUnitario | currency:'ARS' }}</td>
                <td class="col-subtotal">{{ (item.precioUnitario * item.cantidad) | currency:'ARS' }}</td>
                <td class="col-accion pantalla-only">
                  <button type="button" class="btn-eliminar-item" (click)="eliminarItem(item.productoId)" aria-label="Quitar producto">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr class="fila-vacia pantalla-only">
                <td colspan="5">Todavía no agregaste productos. Usá el buscador para empezar.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="total-final">
        <span>Total</span>
        <strong>{{ total() | currency:'ARS' }}</strong>
      </div>
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
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-title {
      margin: 0;
      color: var(--white);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.5rem;
    }

    .empty-catalogo-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--danger);
      padding: 14px 18px;
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
    }
    .empty-catalogo-banner mat-icon { flex-shrink: 0; }

    .datos-cliente {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 20px 24px;
    }
    .campo { display: flex; flex-direction: column; gap: 6px; }
    .campo label {
      font-size: 0.8rem;
      color: var(--ash);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .search-field { width: 100%; }
    .muted-text { color: var(--ash); font-size: 0.85em; }

    .print-header { display: none; }

    .tabla-container {
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      overflow: hidden;
      overflow-x: auto;
    }
    .presupuesto-table { width: 100%; border-collapse: collapse; }
    .presupuesto-table th {
      text-align: left;
      padding: 12px 20px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ash);
      border-bottom: 1px solid var(--border-dim);
      white-space: nowrap;
    }
    .presupuesto-table td {
      padding: 14px 20px;
      font-size: 0.95rem;
      color: var(--white);
      border-bottom: 1px solid var(--border-dim);
    }
    .presupuesto-table tr:last-child td { border-bottom: none; }
    .col-cantidad, .col-precio, .col-subtotal { text-align: right; }
    .col-accion { text-align: center; width: 60px; }

    .cantidad-input {
      width: 64px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      color: var(--white);
      text-align: right;
      font-family: var(--font-body);
    }
    .cantidad-input:focus { outline: none; border-color: var(--signal); }
    .impresion-only { display: none; }

    .btn-eliminar-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--danger);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-eliminar-item:hover { background: rgba(239, 68, 68, 0.1); }

    .fila-vacia td {
      text-align: center;
      color: var(--ash);
      padding: 32px 20px;
    }

    .total-final {
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: 16px;
      padding: 20px 24px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
    }
    .total-final span {
      color: var(--ash);
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .total-final strong {
      color: var(--signal);
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 700;
    }

    /* ── Contraste de Material sobre fondo oscuro (mismo fix aplicado en
       Clientes/Productos: el tema claro de Material por default es ilegible
       sobre --void/--slate) ─────────────────────────────────────────── */
    ::ng-deep .search-field .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.03) !important;
    }
    ::ng-deep .search-field .mat-mdc-form-field-label,
    ::ng-deep .search-field .mdc-floating-label {
      color: var(--ash) !important;
    }
    ::ng-deep .search-field input.mat-mdc-input-element::placeholder {
      color: var(--ash) !important;
    }
    ::ng-deep .search-field .mdc-notched-outline__leading,
    ::ng-deep .search-field .mdc-notched-outline__notch,
    ::ng-deep .search-field .mdc-notched-outline__trailing {
      border-color: var(--border-dim) !important;
    }
    ::ng-deep .search-field mat-icon[matPrefix] { color: var(--ash) !important; }

    /* El panel del autocomplete lo renderiza el CDK Overlay fuera del árbol
       de este componente, así que necesita panelClass + selector global (ver
       mismo patrón resuelto para el mat-select de Pedidos). */
    ::ng-deep .presupuesto-autocomplete-panel {
      background: var(--slate) !important;
      border: 1px solid var(--border-dim) !important;
    }
    ::ng-deep .presupuesto-autocomplete-panel .mat-mdc-option {
      color: var(--white) !important;
    }
    ::ng-deep .presupuesto-autocomplete-panel .mat-mdc-option:hover:not(.mdc-list-item--disabled) {
      background: rgba(0, 174, 239, 0.08) !important;
    }
    ::ng-deep .presupuesto-autocomplete-panel .mat-mdc-option.mdc-list-item--disabled {
      color: var(--ash) !important;
    }

    /* ══════════════════════════════════════════════════════════════════
       IMPRESIÓN: anula por completo el Dark Tech para la hoja de papel.
       El Sidenav/Topbar del layout viven fuera del árbol de este componente
       (son de LayoutComponent) y se ocultan desde el @media print global
       en styles.css; acá solo se controla lo que sí es descendiente propio.
       ══════════════════════════════════════════════════════════════════ */
    @media print {
      :host {
        display: block !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .page-container { max-width: none; gap: 0; }
      .pantalla-only { display: none !important; }

      .print-header { display: block !important; margin-bottom: 24px; }
      .print-header h1 {
        margin: 0 0 4px;
        font-size: 1.6rem;
        font-weight: 700;
        color: #000;
      }
      .print-address { margin: 0 0 8px; color: #333; font-size: 0.9rem; }
      .print-meta { display: flex; gap: 24px; font-size: 0.85rem; color: #333; }
      .print-cliente { margin: 8px 0 0; font-weight: 600; color: #000; }

      .tabla-container { background: #fff !important; border: none !important; border-radius: 0; overflow: visible; }
      .presupuesto-table th, .presupuesto-table td {
        color: #000 !important;
        border: 1px solid #333 !important;
        padding: 8px 12px;
      }
      .presupuesto-table th { background: #f0f0f0 !important; }
      .impresion-only { display: inline !important; }

      .total-final {
        background: #fff !important;
        border: 2px solid #000 !important;
        margin-top: 12px;
      }
      .total-final span, .total-final strong { color: #000 !important; }
      .total-final strong { font-size: 1.5rem; }
    }
  `]
})
export class PresupuestoComponent implements OnInit {
  private productosService = inject(ProductosService);
  private snackBar = inject(MatSnackBar);

  fechaEmision = new Date();

  nombreCliente = signal('');
  validez = signal('7 días');
  items = signal<ItemPresupuesto[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  catalogoVacio = signal(false);

  searchControl = new FormControl('');
  private searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  total = computed(() => this.items().reduce((suma, item) => suma + item.precioUnitario * item.cantidad, 0));

  mostrarSinResultados = computed(() => {
    const query = this.searchQuery();
    return typeof query === 'string' && query.trim().length > 0 && this.productosFiltrados().length === 0;
  });

  ngOnInit() {
    // Chequeo único al entrar: si el catálogo está vacío, avisamos y
    // deshabilitamos el buscador en vez de dejarlo tipear contra la nada.
    this.productosService.listar(1, 1, '').pipe(
      catchError(() => of({ success: false, data: [], total: 0 }))
    ).subscribe((res) => {
      this.catalogoVacio.set(!res.total);
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const query = typeof value === 'string' ? value.trim() : '';
        if (!query) return of({ success: true, data: [], total: 0 });

        return this.productosService.listar(1, 10, query).pipe(
          catchError(() => {
            this.snackBar.open('Error al buscar productos. Intentá de nuevo.', 'Cerrar', { duration: 4000 });
            return of({ success: false, data: [], total: 0 });
          })
        );
      })
    ).subscribe((res) => {
      this.productosFiltrados.set(res.data || []);
    });
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  agregarProducto(event: MatAutocompleteSelectedEvent) {
    const producto = event.option.value as Producto;
    if (!producto) return;

    const yaExiste = this.items().some((item) => item.productoId === producto.id);
    if (yaExiste) {
      this.items.update((actual) =>
        actual.map((item) => item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      );
    } else {
      this.items.update((actual) => [...actual, {
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnitario: Number(producto.precio),
        cantidad: 1
      }]);
    }

    this.searchControl.setValue('');
    this.productosFiltrados.set([]);
  }

  actualizarCantidad(productoId: number, valor: string) {
    const cantidad = Math.max(1, Math.floor(Number(valor)) || 1);
    this.items.update((actual) =>
      actual.map((item) => item.productoId === productoId ? { ...item, cantidad } : item)
    );
  }

  eliminarItem(productoId: number) {
    this.items.update((actual) => actual.filter((item) => item.productoId !== productoId));
  }

  imprimir() {
    window.print();
  }
}
