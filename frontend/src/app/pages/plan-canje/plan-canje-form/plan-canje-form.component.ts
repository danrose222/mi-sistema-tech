import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PlanCanjeService, PlanCanje } from '../../../services/plan-canje.service';

const ESTADOS_QUE_REQUIEREN_VALOR = ['tasado', 'aceptado', 'completado'];

@Component({
  selector: 'app-plan-canje-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Operación de Plan Canje' : 'Nuevo Ingreso — Plan Canje' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="canje-form">
        <h3 class="seccion-titulo">Datos del cliente</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="cliente_nombre" placeholder="Ej. Juan Pérez">
          @if (form.get('cliente_nombre')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="cliente_telefono" placeholder="Ej. +54 9 3548 54-7661">
            @if (form.get('cliente_telefono')?.hasError('required')) {
              <mat-error>El teléfono es requerido para coordinar por WhatsApp</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>DNI</mat-label>
            <input matInput formControlName="cliente_dni" inputmode="numeric" maxlength="8" placeholder="Sin puntos">
            @if (form.get('cliente_dni')?.hasError('pattern')) {
              <mat-error>DNI inválido (7 u 8 dígitos)</mat-error>
            }
          </mat-form-field>
        </div>

        <h3 class="seccion-titulo">Equipo recibido</h3>
        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Marca</mat-label>
            <input matInput formControlName="equipo_marca" placeholder="Ej. Samsung">
            @if (form.get('equipo_marca')?.hasError('required')) {
              <mat-error>La marca es requerida</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Modelo</mat-label>
            <input matInput formControlName="equipo_modelo" placeholder="Ej. Galaxy S21">
            @if (form.get('equipo_modelo')?.hasError('required')) {
              <mat-error>El modelo es requerido</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Capacidad</mat-label>
            <input matInput formControlName="equipo_capacidad" placeholder="Ej. 128GB">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado general del equipo</mat-label>
            <mat-select formControlName="equipo_estado_general">
              <mat-option value="excelente">Excelente</mat-option>
              <mat-option value="bueno">Bueno</mat-option>
              <mat-option value="regular">Regular</mat-option>
              <mat-option value="malo">Malo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <h3 class="seccion-titulo">Equipo entregado (lo que se lleva el cliente)</h3>
        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Condición</mat-label>
            <mat-select formControlName="equipo_entregado_condicion">
              <mat-option [value]="null">Sin definir</mat-option>
              <mat-option value="nuevo">Nuevo</mat-option>
              <mat-option value="usado">Usado</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Pago de la diferencia</mat-label>
            <mat-select formControlName="condicion_pago_diferencia">
              <mat-option [value]="null">Sin definir</mat-option>
              <mat-option value="efectivo">Efectivo</mat-option>
              <mat-option value="mercado_pago">Mercado Pago</mat-option>
              <mat-option value="transferencia">Transferencia</mat-option>
              <mat-option value="financiado">Financiado / Cuotas</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Marca</mat-label>
            <input matInput formControlName="equipo_entregado_marca" placeholder="Ej. Apple">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Modelo</mat-label>
            <input matInput formControlName="equipo_entregado_modelo" placeholder="Ej. iPhone 15">
          </mat-form-field>
        </div>

        <h3 class="seccion-titulo">Operación</h3>
        <div class="fila-2">
          <mat-form-field appearance="outline">
            <mat-label>Estado de la operación</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="pendiente_revision">Pendiente de revisión</mat-option>
              <mat-option value="tasado">Tasado</mat-option>
              <mat-option value="aceptado">Aceptado</mat-option>
              <mat-option value="rechazado">Rechazado</mat-option>
              <mat-option value="completado">Completado</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Valor tasado</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="valor_tasado" min="0" step="0.01">
            <mat-hint>{{ requiereValorTasado() ? 'Requerido en este estado.' : 'Opcional: podés cargar una cotización preliminar.' }}</mat-hint>
            @if (form.get('valor_tasado')?.hasError('required')) {
              <mat-error>El valor tasado es requerido en este estado</mat-error>
            } @else if (form.get('valor_tasado')?.hasError('min')) {
              <mat-error>Debe ser mayor a cero</mat-error>
            }
          </mat-form-field>
        </div>

        @if (form.get('estado')?.value === 'completado') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>ID del pedido donde se usó el saldo</mat-label>
            <input matInput type="number" formControlName="pedido_id" min="1">
            <mat-hint>Opcional: la orden de compra en la que se aplicó este canje.</mat-hint>
            @if (form.get('pedido_id')?.hasError('min')) {
              <mat-error>Debe ser un número de pedido válido</mat-error>
            }
          </mat-form-field>
        }
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
    .canje-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
      min-width: min(460px, 100%);
    }
    .seccion-titulo {
      margin: 8px 0 -4px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .full-width { width: 100%; }
    .fila-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
  `]
})
export class PlanCanjeFormComponent {
  dialogRef = inject(MatDialogRef<PlanCanjeFormComponent>);
  data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private planCanjeService = inject(PlanCanjeService);
  private snackBar = inject(MatSnackBar);

  isEdit = !!this.data?.registro;
  isSaving = false;

  private registro: PlanCanje | undefined = this.data?.registro;

  form: FormGroup = this.fb.group({
    cliente_nombre: [this.registro?.cliente_nombre || '', Validators.required],
    cliente_telefono: [this.registro?.cliente_telefono || '', Validators.required],
    cliente_dni: [this.registro?.cliente_dni || '', [Validators.pattern(/^\d{7,8}$/)]],
    equipo_marca: [this.registro?.equipo_marca || '', Validators.required],
    equipo_modelo: [this.registro?.equipo_modelo || '', Validators.required],
    equipo_capacidad: [this.registro?.equipo_capacidad || ''],
    equipo_estado_general: [this.registro?.equipo_estado_general || 'bueno', Validators.required],
    estado: [this.registro?.estado || 'pendiente_revision', Validators.required],
    valor_tasado: [this.registro?.valor_tasado ?? null, [Validators.min(0)]],
    pedido_id: [this.registro?.pedido_id ?? null, [Validators.min(1)]],
    equipo_entregado_condicion: [this.registro?.equipo_entregado_condicion || null],
    equipo_entregado_marca: [this.registro?.equipo_entregado_marca || ''],
    equipo_entregado_modelo: [this.registro?.equipo_entregado_modelo || ''],
    condicion_pago_diferencia: [this.registro?.condicion_pago_diferencia || null]
  });

  constructor() {
    // El valor tasado se puede cargar en cualquier momento (el admin a veces
    // ya tiene una cotización estimada desde el primer contacto), pero recién
    // se exige > 0 a partir de "Tasado" en adelante. A diferencia de
    // estado_cliente/deuda_historica en cliente-form, acá NO se limpia el
    // valor al cambiar de estado: no tiene sentido perder una cotización ya
    // cargada solo porque el admin ajustó el estado.
    this.form.get('estado')?.valueChanges.subscribe((estado) => this.actualizarValidacionValorTasado(estado));
    this.actualizarValidacionValorTasado(this.form.get('estado')?.value);
  }

  requiereValorTasado(): boolean {
    return ESTADOS_QUE_REQUIEREN_VALOR.includes(this.form.get('estado')?.value);
  }

  private actualizarValidacionValorTasado(estado: string) {
    const control = this.form.get('valor_tasado');
    if (ESTADOS_QUE_REQUIEREN_VALOR.includes(estado)) {
      control?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      control?.setValidators([Validators.min(0)]);
    }
    control?.updateValueAndValidity();
  }

  guardar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const valorFormulario = this.form.value;
    const peticion = this.isEdit
      ? this.planCanjeService.actualizar(this.registro!.id, valorFormulario)
      : this.planCanjeService.crear(valorFormulario);

    peticion.subscribe({
      next: () => {
        this.snackBar.open(`Operación ${this.isEdit ? 'actualizada' : 'registrada'} exitosamente`, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const mensaje = err?.error?.error || 'Ocurrió un error al guardar la operación';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        console.error(err);
        this.isSaving = false;
      }
    });
  }
}
