import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../../../services/clientes.service';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cliente-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej. Juan Pérez">
          @if (form.get('nombre')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>DNI</mat-label>
          <input matInput formControlName="dni" inputmode="numeric" maxlength="8" placeholder="Sin puntos">
          @if (form.get('dni')?.hasError('pattern')) {
            <mat-error>DNI inválido (7 u 8 dígitos)</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="ejemplo@email.com">
          @if (form.get('email')?.hasError('email')) {
            <mat-error>El correo electrónico no es válido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" placeholder="Ej. +54 9 11 1234-5678">
          @if (form.get('telefono')?.hasError('required')) {
            <mat-error>El teléfono es requerido (se usa para los recordatorios por WhatsApp)</mat-error>
          } @else if (form.get('telefono')?.hasError('pattern')) {
            <mat-error>Formato inválido (Ej: +54 9 11 1234-5678)</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección</mat-label>
          <textarea matInput formControlName="direccion" rows="2" placeholder="Ej. Av. Corrientes 1234"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notas adicionales</mat-label>
          <textarea matInput formControlName="notas" rows="3" placeholder="Información relevante del cliente..."></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Deuda histórica</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" formControlName="deuda_historica" min="0" step="0.01">
          <mat-hint>Solo para clientes migrados de un sistema anterior con saldo pendiente. Dejar en 0 si no aplica.</mat-hint>
          @if (form.get('deuda_historica')?.hasError('min')) {
            <mat-error>No puede ser negativa</mat-error>
          }
        </mat-form-field>
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
    .cliente-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 12px;
      min-width: 400px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class ClienteFormComponent {
  dialogRef = inject(MatDialogRef<ClienteFormComponent>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);
  clientesService = inject(ClientesService);
  snackBar = inject(MatSnackBar);

  isEdit = !!this.data?.cliente;
  isSaving = false;

  // Regex para formato teléfono Argentina (con o sin código de país)
  phonePattern = /^(\+?54\s?9\s?)?(\d{2,4})\s?-?\s?(\d{4})\s?-?\s?(\d{4})$/;

  form: FormGroup = this.fb.group({
    nombre: [this.data?.cliente?.nombre || '', Validators.required],
    dni: [this.data?.cliente?.dni || '', [Validators.pattern(/^\d{7,8}$/)]],
    email: [this.data?.cliente?.email || '', [Validators.email]],
    telefono: [this.data?.cliente?.telefono || '', [Validators.required, Validators.pattern(this.phonePattern)]],
    direccion: [this.data?.cliente?.direccion || ''],
    notas: [this.data?.cliente?.notas || ''],
    deuda_historica: [this.data?.cliente?.deuda_historica ?? 0, [Validators.min(0)]]
  });

  guardar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const peticion = this.isEdit
      ? this.clientesService.actualizar(this.data.cliente.id, this.form.value)
      : this.clientesService.crear(this.form.value);

    peticion.subscribe({
      next: () => {
        this.snackBar.open(`Cliente ${this.isEdit ? 'actualizado' : 'creado'} exitosamente`, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true); // Retorna true para refrescar la tabla
      },
      error: (err) => {
        this.snackBar.open('Ocurrió un error al guardar el cliente', 'Cerrar', { duration: 3000 });
        console.error(err);
        this.isSaving = false;
      }
    });
  }
}
