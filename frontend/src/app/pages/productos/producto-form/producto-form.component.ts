import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule
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
          <label class="imagen-label">Imagen del producto</label>
          <div class="imagen-preview-row">
            @if (previewUrl()) {
              <img [src]="previewUrl()" alt="Vista previa del producto" class="imagen-preview">
            } @else {
              <div class="imagen-placeholder">
                <mat-icon>image</mat-icon>
              </div>
            }
            <div class="imagen-actions">
              <button type="button" mat-stroked-button color="primary" (click)="fileInput.click()">
                <mat-icon>upload</mat-icon>
                {{ previewUrl() ? 'Cambiar imagen' : 'Subir imagen' }}
              </button>
              @if (archivoSeleccionado()) {
                <span class="imagen-filename">{{ archivoSeleccionado()!.name }}</span>
              }
              <span class="imagen-hint">JPG, PNG, WEBP o GIF · máx. 5MB</span>
            </div>
          </div>
          <input
            #fileInput
            type="file"
            class="imagen-input-hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            (change)="onFileSelected($event)">
        </div>

        <mat-checkbox formControlName="activo">Producto activo (visible en el catálogo)</mat-checkbox>
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
      min-width: 420px;
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
      gap: 16px;
    }
    .imagen-preview {
      width: 88px;
      height: 88px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid #e2e8f0;
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

  // Imagen existente (si estamos editando) o preview del archivo recién
  // elegido (via URL.createObjectURL). null = sin imagen -> placeholder.
  previewUrl = signal<string | null>(this.data?.producto?.imagen_url || null);
  archivoSeleccionado = signal<File | null>(null);
  private objectUrlCreada: string | null = null;

  isEdit = !!this.data?.producto;
  isSaving = false;

  form: FormGroup = this.fb.group({
    nombre: [this.data?.producto?.nombre || '', Validators.required],
    descripcion: [this.data?.producto?.descripcion || ''],
    sku: [this.data?.producto?.sku || ''],
    barcode: [this.data?.producto?.barcode || ''],
    precio: [this.data?.producto?.precio ?? '', [Validators.required, Validators.min(0)]],
    stock: [this.data?.producto?.stock ?? 0, [Validators.min(0)]],
    activo: [this.data?.producto ? !!this.data.producto.activo : true]
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;

    this.archivoSeleccionado.set(archivo);

    if (this.objectUrlCreada) {
      URL.revokeObjectURL(this.objectUrlCreada);
    }
    this.objectUrlCreada = URL.createObjectURL(archivo);
    this.previewUrl.set(this.objectUrlCreada);
  }

  ngOnDestroy() {
    if (this.objectUrlCreada) {
      URL.revokeObjectURL(this.objectUrlCreada);
    }
  }

  private buildPayload(): FormData | Partial<Producto> {
    const archivo = this.archivoSeleccionado();
    if (!archivo) {
      return this.form.value;
    }

    // Con imagen nueva el body va como multipart: cada campo del form como
    // string + el archivo bajo la key 'imagen' (coincide con
    // uploadMiddleware.uploadProductoImagen = multer(...).single('imagen')).
    const formData = new FormData();
    Object.entries(this.form.value).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    formData.append('imagen', archivo, archivo.name);
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
