import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductosService } from '../../../services/productos.service';

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
    MatCheckboxModule
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
  `]
})
export class ProductoFormComponent {
  dialogRef = inject(MatDialogRef<ProductoFormComponent>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);
  productosService = inject(ProductosService);
  snackBar = inject(MatSnackBar);

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

  guardar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const peticion = this.isEdit
      ? this.productosService.actualizar(this.data.producto.id, this.form.value)
      : this.productosService.crear(this.form.value);

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
