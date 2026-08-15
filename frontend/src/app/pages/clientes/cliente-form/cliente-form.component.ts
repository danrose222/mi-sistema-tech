import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
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
    MatButtonModule,
    MatRadioModule
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

        <div class="estado-field">
          <label class="estado-label">Estado del cliente</label>
          <mat-radio-group formControlName="estado_cliente" class="estado-radio-group">
            <mat-radio-button value="AL_DIA">Al día</mat-radio-button>
            <mat-radio-button value="MOROSO">Moroso</mat-radio-button>
          </mat-radio-group>
        </div>

        @if (form.get('estado_cliente')?.value === 'MOROSO') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Monto de deuda histórica</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="deuda_historica" min="0.01" step="0.01">
            <mat-hint>Saldo migrado de un sistema anterior, pendiente de cobro.</mat-hint>
            @if (form.get('deuda_historica')?.hasError('required')) {
              <mat-error>La deuda es requerida para un cliente moroso</mat-error>
            } @else if (form.get('deuda_historica')?.hasError('min')) {
              <mat-error>Debe ser mayor a cero</mat-error>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notas adicionales</mat-label>
          <textarea matInput formControlName="notas" rows="3" placeholder="Información relevante del cliente..."></textarea>
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
      min-width: min(400px, 100%);
    }
    .full-width {
      width: 100%;
    }
    .estado-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .estado-label {
      font-size: 0.75rem;
      color: #555;
    }
    .estado-radio-group {
      display: flex;
      gap: 24px;
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
    estado_cliente: [this.data?.cliente?.estado_cliente || 'AL_DIA', Validators.required],
    deuda_historica: [this.data?.cliente?.deuda_historica ?? 0, [Validators.min(0)]]
  });

  constructor() {
    // La deuda solo es requerida (y > 0) cuando el cliente está marcado como
    // moroso; al volver a "Al día" se limpia el monto para no arrastrar un
    // valor viejo que ya no corresponde.
    this.form.get('estado_cliente')?.valueChanges.subscribe((estado) => this.actualizarValidacionDeuda(estado));
    this.actualizarValidacionDeuda(this.form.get('estado_cliente')?.value);
  }

  private actualizarValidacionDeuda(estado: string) {
    const deudaControl = this.form.get('deuda_historica');
    if (estado === 'MOROSO') {
      deudaControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      deudaControl?.setValue(0);
      deudaControl?.setValidators([Validators.min(0)]);
    }
    deudaControl?.updateValueAndValidity();
  }

  guardar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const valorFormulario = {
      ...this.form.value,
      deuda_historica: this.form.value.estado_cliente === 'MOROSO' ? this.form.value.deuda_historica : 0
    };
    const peticion = this.isEdit
      ? this.clientesService.actualizar(this.data.cliente.id, valorFormulario)
      : this.clientesService.crear(valorFormulario);

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
