import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductosService, Producto } from '../../../services/productos.service';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="producto-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej. iPhone 15 Pro">
          @if (form.get('nombre')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="2"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Código de barras</mat-label>
            <input matInput formControlName="barcode">
            <button matSuffix mat-icon-button type="button" (click)="generarCodigoInterno()" matTooltip="Generar código interno único">
              <mat-icon>qr_code_2</mat-icon>
            </button>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Precio</mat-label>
            <input matInput type="number" formControlName="precio" min="0" step="0.01">
            @if (form.get('precio')?.hasError('required')) {
              <mat-error>El precio es requerido</mat-error>
            }
            @if (form.get('precio')?.hasError('min')) {
              <mat-error>El precio no puede ser negativo</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Stock</mat-label>
            <input matInput type="number" formControlName="stock" min="0" step="1">
            @if (form.get('stock')?.hasError('min')) {
              <mat-error>El stock no puede ser negativo</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="imagen-uploader">
          <label class="imagen-label">Imágenes del producto (hasta 5, la primera es la principal)</label>
          <div class="imagen-preview-row">
            @if (previewUrls().length > 0) {
              @for (url of previewUrls(); track $index) {
                <div class="imagen-preview-item" [class.principal]="$index === 0">
                  <img [src]="url" alt="Vista previa del producto">
                  @if ($index === 0) {
                    <span class="imagen-badge">Principal</span>
                  }
                </div>
              }
            } @else {
              <div class="imagen-placeholder">
                <mat-icon>image</mat-icon>
              </div>
            }
            <div class="imagen-actions">
              <button type="button" mat-stroked-button color="primary" (click)="fileInput.click()">
                <mat-icon>upload</mat-icon>
                {{ previewUrls().length > 0 ? 'Cambiar imágenes' : 'Subir imágenes' }}
              </button>
              @if (archivosSeleccionados().length > 0) {
                <span class="imagen-filename">{{ archivosSeleccionados().length }} archivo(s) seleccionado(s)</span>
              }
              <span class="imagen-hint">JPG, PNG, WEBP o GIF · máx. 5MB c/u · hasta 5 fotos</span>
            </div>
          </div>
          <input
            #fileInput
            type="file"
            multiple
            class="imagen-input-hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            (change)="onFilesSelected($event)">
        </div>

        <mat-checkbox formControlName="activo">Producto activo (visible en el catálogo)</mat-checkbox>
        <mat-checkbox formControlName="requiere_imei">
          Requiere IMEI / N° de serie (celulares)
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || isSaving" (click)="guardar()">
        {{ isSaving ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .producto-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 12px;
      min-width: min(420px, 100%);
    }
    .full-width { width: 100%; }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .imagen-uploader { display: flex; flex-direction: column; gap: 8px; }
    .imagen-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748b;
    }
    .imagen-preview-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .imagen-preview-item {
      position: relative;
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }
    .imagen-preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid #e2e8f0;
      display: block;
    }
    .imagen-preview-item.principal img {
      border: 2px solid var(--signal);
    }
    .imagen-badge {
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--signal);
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 100px;
      white-space: nowrap;
    }
    .imagen-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
      border: 2px dashed #cbd5e1;
      border-radius: var(--radius-sm);
      color: #94a3b8;
    }
    .imagen-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .imagen-filename { font-size: 0.8rem; color: #1e293b; }
    .imagen-hint { font-size: 0.75rem; color: #94a3b8; }
    .imagen-input-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      overflow: hidden;
      pointer-events: none;
    }
  `]
})
export class ProductoFormComponent implements OnDestroy {
  dialogRef = inject(MatDialogRef<ProductoFormComponent>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);
  productosService = inject(ProductosService);
  snackBar = inject(MatSnackBar);

  // Imágenes existentes (si estamos editando) o previews de los archivos
  // recién elegidos (via URL.createObjectURL). Array vacío -> placeholder.
  previewUrls = signal<string[]>(this.data?.producto?.imagenes || []);
  archivosSeleccionados = signal<File[]>([]);
  private objectUrlsCreadas: string[] = [];

  isEdit = !!this.data?.producto;
  isSaving = false;

  form: FormGroup = this.fb.group({
    nombre: [this.data?.producto?.nombre || '', Validators.required],
    descripcion: [this.data?.producto?.descripcion || ''],
    sku: [this.data?.producto?.sku || ''],
    barcode: [this.data?.producto?.barcode || ''],
    precio: [this.data?.producto?.precio ?? '', [Validators.required, Validators.min(0)]],
    stock: [this.data?.producto?.stock ?? 0, [Validators.min(0)]],
    activo: [this.data?.producto ? !!this.data.producto.activo : true],
    requiere_imei: [this.data?.producto ? !!this.data.producto.requiere_imei : false]
  });

  generarCodigoInterno() {
    const codigo = `CEL-${Date.now()}`;
    this.form.get('barcode')?.setValue(codigo);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []).slice(0, 5);
    if (archivos.length === 0) return;

    this.archivosSeleccionados.set(archivos);

    this.objectUrlsCreadas.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrlsCreadas = archivos.map((archivo) => URL.createObjectURL(archivo));
    this.previewUrls.set(this.objectUrlsCreadas);
  }

  ngOnDestroy() {
    this.objectUrlsCreadas.forEach((url) => URL.revokeObjectURL(url));
  }

  private buildPayload(): FormData | Partial<Producto> {
    const archivos = this.archivosSeleccionados();
    if (archivos.length === 0) {
      return this.form.value;
    }

    // Con imágenes nuevas el body va como multipart: cada campo del form como
    // string + cada archivo bajo la key 'imagenes' repetida (coincide con
    // uploadMiddleware.uploadProductoImagen = multer(...).array('imagenes', 5)).
    const formData = new FormData();
    Object.entries(this.form.value).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    archivos.forEach((archivo) => formData.append('imagenes', archivo, archivo.name));
    return formData;
  }

  guardar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const payload = this.buildPayload();
    const peticion = this.isEdit
      ? this.productosService.actualizar(this.data.producto.id, payload)
      : this.productosService.crear(payload);

    peticion.subscribe({
      next: () => {
        this.snackBar.open(`Producto ${this.isEdit ? 'actualizado' : 'creado'} exitosamente`, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const mensaje = err?.error?.error || 'Ocurrió un error al guardar el producto';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        console.error(err);
        this.isSaving = false;
      }
    });
  }
}
