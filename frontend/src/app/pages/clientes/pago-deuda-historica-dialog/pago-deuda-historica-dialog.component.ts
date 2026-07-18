import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClientesService } from '../../../services/clientes.service';

const MARGEN_ERROR = 0.01;

@Component({
  selector: 'app-pago-deuda-historica-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Registrar Pago de Deuda Histórica</h2>
    <mat-dialog-content>
      <div class="deuda-actual">
        <span>Deuda pendiente</span>
        <strong>{{ data.deudaActual | currency:'ARS' }}</strong>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Monto a pagar</mat-label>
        <span matTextPrefix>$&nbsp;</span>
        <input matInput type="number" min="0.01" step="0.01" [value]="monto()" (input)="monto.set(valorNumerico($event))">
        <mat-hint>Puede ser un pago parcial o el total de la deuda.</mat-hint>
      </mat-form-field>

      @if (excedeDeuda()) {
        <p class="aviso aviso-error">
          <mat-icon>error_outline</mat-icon>
          El monto no puede superar la deuda pendiente ({{ data.deudaActual | currency:'ARS' }}).
        </p>
      }

      @if (error(); as msg) {
        <p class="aviso aviso-error"><mat-icon>error_outline</mat-icon> {{ msg }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="isSaving()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!puedeConfirmar() || isSaving()" (click)="confirmar()">
        {{ isSaving() ? 'Registrando...' : 'Registrar Pago' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 380px; padding-top: 8px; }
    .full-width { width: 100%; }

    .deuda-actual {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .deuda-actual span { color: #b91c1c; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .deuda-actual strong { color: #b91c1c; font-size: 1.6rem; font-weight: 800; }

    .aviso {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 0;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .aviso mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .aviso-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  `]
})
export class PagoDeudaHistoricaDialogComponent {
  dialogRef = inject(MatDialogRef<PagoDeudaHistoricaDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { clienteId: number; deudaActual: number };
  private clientesService = inject(ClientesService);

  // Precarga con el total de la deuda: el caso más común es cancelarla
  // completa, el cajero solo tiene que tocar el campo para un pago parcial.
  monto = signal(this.data.deudaActual);
  isSaving = signal(false);
  error = signal<string | null>(null);

  excedeDeuda = computed(() => this.monto() > this.data.deudaActual + MARGEN_ERROR);

  puedeConfirmar = computed(() => this.monto() > 0 && !this.excedeDeuda());

  valorNumerico(event: Event): number {
    const valor = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(valor) && valor >= 0 ? valor : 0;
  }

  confirmar() {
    if (!this.puedeConfirmar() || this.isSaving()) return;

    this.isSaving.set(true);
    this.error.set(null);

    this.clientesService.pagarDeudaHistorica(this.data.clienteId, this.monto()).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.dialogRef.close(res.data);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err?.error?.error || 'No se pudo registrar el pago');
      }
    });
  }
}
