import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StockService, StockMovimiento, ProductoStock } from '../../services/stock.service';
import { BarcodeScannerComponent } from '../../components/barcode-scanner.component';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    BarcodeScannerComponent
  ],
  template: `
    <div class="page-container">
      <h2 class="page-title">Gestión de Stock</h2>
      <p class="page-sub">Escaneá un código de barras (pistola láser o cámara) o buscalo manualmente para ajustar el stock.</p>

      <div class="stock-layout">
        <div class="panel">
          <h3>1. Identificar producto</h3>

          <div class="barcode-input-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Código de barras</mat-label>
              <input
                #barcodeInput
                matInput
                [formControl]="barcodeControl"
                placeholder="Escaneá con la pistola o escribí el código y presioná Enter"
                (keyup.enter)="buscarPorBarcode()">
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="buscarPorBarcode()" [disabled]="!barcodeControl.value">
              Buscar
            </button>
          </div>

          <button mat-stroked-button color="primary" class="scanner-toggle" (click)="mostrarCamara.set(!mostrarCamara())">
            <mat-icon>photo_camera</mat-icon>
            {{ mostrarCamara() ? 'Ocultar cámara' : 'Usar cámara web' }}
          </button>

          @if (mostrarCamara()) {
            <app-barcode-scanner (barcodeDetected)="onBarcodeDetected($event)"></app-barcode-scanner>
          }

          @if (isBuscando()) {
            <div class="buscando"><mat-spinner diameter="24"></mat-spinner> Buscando producto...</div>
          }

          @if (productoEncontrado()) {
            <div class="producto-encontrado">
              <mat-icon class="ok-icon">check_circle</mat-icon>
              <div>
                <div class="fw-500">{{ productoEncontrado()?.nombre }}</div>
                <div class="muted">Stock actual: {{ productoEncontrado()?.stock }}</div>
              </div>
            </div>
          }
        </div>

        <div class="panel">
          <h3>2. Registrar movimiento</h3>

          <form [formGroup]="form" (ngSubmit)="ajustar()" class="movimiento-form">
            <mat-form-field appearance="outline">
              <mat-label>ID de producto</mat-label>
              <input matInput type="number" formControlName="producto_id">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo">
                <mat-option value="ingreso">Ingreso</mat-option>
                <mat-option value="egreso">Egreso</mat-option>
                <mat-option value="ajuste">Ajuste</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Cantidad</mat-label>
              <input matInput type="number" formControlName="cantidad" min="1">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nota (opcional)</mat-label>
              <input matInput formControlName="nota" placeholder="Ej. Reposición de proveedor">
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isSaving()">
              {{ isSaving() ? 'Guardando...' : 'Ajustar stock' }}
            </button>
          </form>
        </div>
      </div>

      <div class="panel movimientos-panel">
        <h3>Movimientos recientes</h3>
        @if (isLoadingMovimientos()) {
          <div class="buscando"><mat-spinner diameter="24"></mat-spinner></div>
        } @else if (movimientos().length === 0) {
          <p class="muted">Todavía no hay movimientos de stock registrados.</p>
        } @else {
          <table class="movimientos-table">
            <thead>
              <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Nota</th></tr>
            </thead>
            <tbody>
              @for (m of movimientos(); track m.id) {
                <tr>
                  <td>{{ m.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ m.producto_nombre }}</td>
                  <td><span class="badge" [class]="'tipo-' + m.tipo">{{ m.tipo }}</span></td>
                  <td>{{ m.cantidad }}</td>
                  <td class="muted">{{ m.nota || '-' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 20px; }
    .page-title { margin: 0; font-family: var(--font-display); font-weight: 700; color: var(--white); }
    .page-sub { margin: 0; color: var(--ash); }

    .stock-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    /* El resto del panel admin (Clientes, Créditos, Productos) usa tarjetas
       blancas; este componente usaba por error la clase global .card del
       catálogo público (fondo oscuro --slate), lo que dejaba el texto negro
       de los inputs de Material ilegible sobre fondo oscuro. Se unifica acá
       con el mismo estilo de tarjeta clara que usa el resto del admin. */
    .panel {
      background: white;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 20px 24px;
    }
    .panel h3 { margin: 0 0 16px 0; color: #1e293b; font-family: var(--font-display); font-size: 1.05rem; }

    .barcode-input-row { display: flex; gap: 12px; align-items: flex-start; }
    .full-width { width: 100%; }

    .scanner-toggle { margin-top: 4px; margin-bottom: 12px; }

    .buscando { display: flex; align-items: center; gap: 10px; color: #64748b; padding: 8px 0; }

    .producto-encontrado {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.25);
      border-radius: var(--radius-sm);
      margin-top: 12px;
    }
    .ok-icon { color: var(--success); }
    .fw-500 { font-weight: 500; color: #1e293b; }
    .muted { color: #64748b; font-size: 0.85rem; }

    .movimiento-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .movimiento-form .full-width { grid-column: 1 / -1; }
    .movimiento-form button { grid-column: 1 / -1; justify-self: start; }

    .movimientos-panel { overflow-x: auto; }
    .movimientos-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .movimientos-table th {
      text-align: left; color: #64748b; font-weight: 500;
      padding: 10px 8px; border-bottom: 1px solid #e2e8f0;
    }
    .movimientos-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .tipo-ingreso { background: rgba(34, 197, 94, 0.12); color: var(--success); }
    .tipo-egreso { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
    .tipo-ajuste { background: rgba(0, 174, 239, 0.12); color: var(--signal); }

    @media (max-width: 900px) {
      .stock-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class StockComponent implements OnInit {
  @ViewChild('barcodeInput') barcodeInputRef?: ElementRef<HTMLInputElement>;

  private stockService = inject(StockService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  barcodeControl = this.fb.control('');
  mostrarCamara = signal(false);
  isBuscando = signal(false);
  productoEncontrado = signal<ProductoStock | null>(null);

  movimientos = signal<StockMovimiento[]>([]);
  isLoadingMovimientos = signal(false);
  isSaving = signal(false);

  form = this.fb.group({
    producto_id: [null as number | null, Validators.required],
    tipo: ['ingreso' as 'ingreso' | 'egreso' | 'ajuste', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    nota: ['']
  });

  ngOnInit() {
    this.cargarMovimientos();
  }

  cargarMovimientos() {
    this.isLoadingMovimientos.set(true);
    this.stockService.listarMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.isLoadingMovimientos.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingMovimientos.set(false);
      }
    });
  }

  buscarPorBarcode() {
    const barcode = this.barcodeControl.value;
    if (!barcode) return;

    this.isBuscando.set(true);
    this.productoEncontrado.set(null);
    this.stockService.buscarProductoPorBarcode(barcode).subscribe({
      next: (res) => {
        this.productoEncontrado.set(res.data);
        this.form.patchValue({ producto_id: res.data.id });
        this.isBuscando.set(false);
        this.barcodeControl.setValue('');
      },
      error: () => {
        this.snackBar.open(`No se encontró ningún producto con el código "${barcode}"`, 'Cerrar', { duration: 4000 });
        this.isBuscando.set(false);
      }
    });
  }

  onBarcodeDetected(barcode: string) {
    this.mostrarCamara.set(false);
    this.barcodeControl.setValue(barcode);
    this.buscarPorBarcode();
  }

  ajustar() {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const { producto_id, tipo, cantidad, nota } = this.form.value;

    this.stockService.ajustarStock({
      producto_id: producto_id!,
      tipo: tipo!,
      cantidad: cantidad!,
      nota: nota || undefined
    }).subscribe({
      next: (res) => {
        this.snackBar.open(`Stock actualizado: ${res.producto.nombre} ahora tiene ${res.producto.stock} unidades`, 'Cerrar', { duration: 4000 });
        this.productoEncontrado.set(res.producto);
        this.form.patchValue({ cantidad: 1, nota: '' });
        this.isSaving.set(false);
        this.cargarMovimientos();
      },
      error: (err) => {
        const mensaje = err?.error?.error || 'No se pudo ajustar el stock';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        console.error(err);
        this.isSaving.set(false);
      }
    });
  }
}
