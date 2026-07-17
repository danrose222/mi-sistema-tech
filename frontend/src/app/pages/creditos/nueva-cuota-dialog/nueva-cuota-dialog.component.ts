import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CreditosService, Cuota } from '../../../services/creditos.service';

@Component({
  selector: 'app-nueva-cuota-dialog',
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
    <h2 mat-dialog-title>Registrar Pago: Cuota #{{ data.cuota.numero_cuota }}</h2>
    <mat-dialog-content>
      <p class="subtitle">Saldo pendiente actual: <strong class="text-primary">{{ data.cuota.saldo_pendiente | currency:'ARS' }}</strong></p>
      
      <form [formGroup]="form" class="pago-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monto a pagar</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" formControlName="monto" min="1" [max]="data.cuota.saldo_pendiente" step="0.01" autofocus>
          @if (form.get('monto')?.hasError('required')) {
            <mat-error>El monto es requerido</mat-error>
          }
          @if (form.get('monto')?.hasError('min')) {
            <mat-error>El monto debe ser mayor a 0</mat-error>
          }
          @if (form.get('monto')?.hasError('max')) {
            <mat-error>El monto no puede superar el saldo pendiente de la cuota</mat-error>
          }
        </mat-form-field>
        <p class="hint">Puede registrar un pago parcial. Si el monto es menor al saldo, la cuota seguirá pendiente.</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || isSaving" (click)="pagar()">
        {{ isSaving ? 'Procesando...' : 'Confirmar Pago' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .pago-form {
      margin-top: 16px;
      min-width: 350px;
    }
    .full-width {
      width: 100%;
    }
    .subtitle {
      color: #334155;
      font-size: 1.05rem;
      margin-bottom: 8px;
    }
    .text-primary { color: #0ea5e9; font-weight: 700; }
    .hint {
      color: #64748b;
      font-size: 0.85rem;
      margin-top: -8px;
    }
  `]
})
export class NuevaCuotaDialogComponent {
  dialogRef = inject(MatDialogRef<NuevaCuotaDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { creditoId: number, cuota: Cuota };
  fb = inject(FormBuilder);
  creditosService = inject(CreditosService);
  snackBar = inject(MatSnackBar);

  isSaving = false;

  form: FormGroup = this.fb.group({
    monto: [this.data.cuota.saldo_pendiente, [
      Validators.required, 
      Validators.min(1), 
      Validators.max(Number(this.data.cuota.saldo_pendiente)) // Asegurar tipo
    ]]
  });

  pagar() {
    if (this.form.invalid) return;

    this.isSaving = true;
    const monto = this.form.get('monto')?.value;

    this.creditosService.pagarCuota(this.data.creditoId, this.data.cuota.id, monto).subscribe({
      next: (res) => {
        this.snackBar.open('Pago procesado correctamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(err.error?.error || 'Error al registrar el pago', 'Cerrar', { duration: 4000 });
        this.isSaving = false;
      }
    });
  }
}
