import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DesglosePago {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

const MARGEN_ERROR = 0.01;

@Component({
  selector: 'app-pago-mixto-dialog',
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
    <h2 mat-dialog-title>Confirmar Pago</h2>
    <mat-dialog-content>
      <div class="total-a-cobrar">
        <span>Total a cobrar</span>
        <strong>{{ data.total | currency:'ARS' }}</strong>
      </div>

      <div class="montos-grid">
        <mat-form-field appearance="outline">
          <mat-label>Efectivo</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" min="0" step="0.01" [value]="efectivo()" (input)="efectivo.set(valorNumerico($event))">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tarjeta Débito/Crédito</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" min="0" step="0.01" [value]="tarjeta()" (input)="tarjeta.set(valorNumerico($event))">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Transferencia</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" min="0" step="0.01" [value]="transferencia()" (input)="transferencia.set(valorNumerico($event))">
        </mat-form-field>
      </div>

      @if (electronicoExcedeTotal()) {
        <p class="aviso aviso-error">
          <mat-icon>error_outline</mat-icon>
          La tarjeta y la transferencia no pueden sumar más que el total: no hay "vuelto" en un pago electrónico.
        </p>
      } @else if (vuelto() > 0) {
        <div class="resumen-linea vuelto">
          <span>Vuelto</span>
          <strong>{{ vuelto() | currency:'ARS' }}</strong>
        </div>
      } @else if (restante() > 0) {
        <div class="resumen-linea restante">
          <span>Restante</span>
          <strong>{{ restante() | currency:'ARS' }}</strong>
        </div>
      } @else {
        <div class="resumen-linea completo">
          <mat-icon>check_circle</mat-icon>
          <span>Pago completo</span>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!puedeFinalizar()" (click)="finalizar()">
        Finalizar Venta
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 380px; padding-top: 8px; }

    .total-a-cobrar {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .total-a-cobrar span { color: #0369a1; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .total-a-cobrar strong { color: #0369a1; font-size: 1.6rem; font-weight: 800; }

    .montos-grid {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

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

    .resumen-linea {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
    }
    .resumen-linea.restante { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .resumen-linea.restante strong { font-size: 1.2rem; }
    .resumen-linea.vuelto { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .resumen-linea.vuelto strong { font-size: 1.2rem; }
    .resumen-linea.completo { justify-content: center; gap: 8px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-weight: 600; }
    .resumen-linea.completo mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class PagoMixtoDialogComponent {
  dialogRef = inject(MatDialogRef<PagoMixtoDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { total: number };

  // Precarga el total en "efectivo": es el caso más común (pago único, sin
  // dividir), y el cajero solo tiene que tocar los otros campos si hace falta.
  efectivo = signal(this.data.total);
  tarjeta = signal(0);
  transferencia = signal(0);

  totalIngresado = computed(() => this.redondear(this.efectivo() + this.tarjeta() + this.transferencia()));
  restante = computed(() => Math.max(0, this.redondear(this.data.total - this.totalIngresado())));
  vuelto = computed(() => Math.max(0, this.redondear(this.totalIngresado() - this.data.total)));

  // Mismo chequeo que hace el backend: tarjeta/transferencia son montos
  // exactos, no admiten "vuelto electrónico".
  electronicoExcedeTotal = computed(() => this.redondear(this.tarjeta() + this.transferencia()) > this.data.total + MARGEN_ERROR);

  puedeFinalizar = computed(() =>
    this.totalIngresado() >= this.data.total - MARGEN_ERROR && !this.electronicoExcedeTotal()
  );

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  valorNumerico(event: Event): number {
    const valor = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(valor) && valor >= 0 ? valor : 0;
  }

  finalizar() {
    if (!this.puedeFinalizar()) return;
    const desglose: DesglosePago = {
      efectivo: this.efectivo(),
      tarjeta: this.tarjeta(),
      transferencia: this.transferencia()
    };
    this.dialogRef.close(desglose);
  }
}
