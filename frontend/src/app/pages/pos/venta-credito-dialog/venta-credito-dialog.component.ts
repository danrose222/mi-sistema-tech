import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ClientesService, ClienteConEstadoCrediticio } from '../../../services/clientes.service';
import { CreditoPosInput } from '../../../services/order.service';

@Component({
  selector: 'app-venta-credito-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Venta a Crédito</h2>
    <mat-dialog-content>
      <div class="total-a-financiar">
        <span>Total a financiar</span>
        <strong>{{ data.total | currency:'ARS' }}</strong>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>DNI del cliente</mat-label>
        <input matInput #dniInput inputmode="numeric" maxlength="8" [disabled]="!!clienteEncontrado()" (keyup.enter)="buscarCliente(dniInput.value)">
        @if (!clienteEncontrado()) {
          <button matSuffix mat-icon-button (click)="buscarCliente(dniInput.value)" [disabled]="isBuscando()" aria-label="Buscar cliente">
            <mat-icon>search</mat-icon>
          </button>
        } @else {
          <button matSuffix mat-icon-button (click)="limpiarCliente()" aria-label="Cambiar cliente">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      @if (isBuscando()) {
        <div class="buscando"><mat-spinner diameter="18"></mat-spinner> Buscando...</div>
      }

      @if (errorBusqueda(); as msg) {
        <p class="aviso aviso-error"><mat-icon>error_outline</mat-icon> {{ msg }}</p>
      }

      @if (clienteEncontrado(); as c) {
        <div class="cliente-card">
          <mat-icon>person</mat-icon>
          <div class="cliente-datos">
            <strong>{{ c.nombre }}</strong>
            <span>{{ c.telefono || 'Sin teléfono registrado' }}</span>
          </div>
        </div>

        @if (c.estado_crediticio === 'moroso') {
          <p class="aviso aviso-warn">
            <mat-icon>warning</mat-icon>
            Atención: este cliente tiene un crédito moroso registrado. Confirmá con el encargado antes de continuar.
          </p>
        }

        <div class="cuotas-grid">
          <mat-form-field appearance="outline">
            <mat-label>Cantidad de cuotas</mat-label>
            <input matInput type="number" min="2" step="1" [value]="cantidadCuotas()" (input)="cantidadCuotas.set(valorEntero($event))">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Frecuencia</mat-label>
            <mat-select [value]="frecuencia()" (selectionChange)="frecuencia.set($event.value)">
              <mat-option value="mensual">Mensual</mat-option>
              <mat-option value="semanal">Semanal</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fecha de la primera cuota</mat-label>
            <input matInput type="date" [value]="fechaPrimeraCuota()" [min]="fechaMinima" (input)="fechaPrimeraCuota.set(valorFecha($event))">
          </mat-form-field>
        </div>

        @if (montoPorCuota() > 0) {
          <div class="resumen-linea">
            <span>Valor de cada cuota</span>
            <strong>{{ montoPorCuota() | currency:'ARS' }}</strong>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!puedeConfirmar()" (click)="confirmar()">
        Confirmar Crédito
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 380px; padding-top: 8px; }
    .full-width { width: 100%; }

    .total-a-financiar {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .total-a-financiar span { color: #92400e; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .total-a-financiar strong { color: #92400e; font-size: 1.6rem; font-weight: 800; }

    .buscando {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 0.85rem;
      margin: 4px 0 12px;
    }

    .aviso {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 12px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .aviso mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .aviso-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .aviso-warn { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .cliente-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      color: #15803d;
    }
    .cliente-datos { display: flex; flex-direction: column; gap: 2px; }
    .cliente-datos strong { color: #14532d; font-size: 0.95rem; }
    .cliente-datos span { font-size: 0.8rem; color: #16a34a; }

    .cuotas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }

    .resumen-linea {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #f0f9ff;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    .resumen-linea strong { font-size: 1.2rem; }
  `]
})
export class VentaCreditoDialogComponent {
  dialogRef = inject(MatDialogRef<VentaCreditoDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { total: number; clienteInicial?: ClienteConEstadoCrediticio | null };
  private clientesService = inject(ClientesService);

  readonly fechaMinima = new Date().toISOString().split('T')[0];

  isBuscando = signal(false);
  errorBusqueda = signal<string | null>(null);
  // Si el cajero ya asoció un cliente en la pantalla del POS, se precarga
  // acá para no obligarlo a buscarlo dos veces (igual puede cambiarlo).
  clienteEncontrado = signal<ClienteConEstadoCrediticio | null>(this.data.clienteInicial ?? null);

  cantidadCuotas = signal(3);
  frecuencia = signal<'semanal' | 'mensual'>('mensual');
  fechaPrimeraCuota = signal(this.fechaMinima);

  montoPorCuota = computed(() => {
    const cuotas = this.cantidadCuotas();
    if (!cuotas || cuotas < 2) return 0;
    return Math.round((this.data.total / cuotas) * 100) / 100;
  });

  puedeConfirmar = computed(() =>
    !!this.clienteEncontrado() &&
    this.cantidadCuotas() >= 2 &&
    !!this.fechaPrimeraCuota()
  );

  buscarCliente(dniRaw: string) {
    const dni = dniRaw.trim();
    if (!dni || this.isBuscando()) return;

    this.isBuscando.set(true);
    this.errorBusqueda.set(null);

    this.clientesService.buscarPorDni(dni).subscribe({
      next: (res) => {
        this.clienteEncontrado.set(res.data);
        this.isBuscando.set(false);
      },
      error: (err) => {
        this.isBuscando.set(false);
        this.errorBusqueda.set(
          err?.status === 404
            ? 'No se encontró ningún cliente con ese DNI. Registralo primero en el panel de Clientes.'
            : 'Error al buscar el cliente'
        );
      }
    });
  }

  limpiarCliente() {
    this.clienteEncontrado.set(null);
    this.errorBusqueda.set(null);
  }

  valorEntero(event: Event): number {
    const valor = Math.trunc(Number((event.target as HTMLInputElement).value));
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  }

  valorFecha(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  confirmar() {
    if (!this.puedeConfirmar()) return;
    const credito: CreditoPosInput = {
      clienteId: this.clienteEncontrado()!.id,
      cantidadCuotas: this.cantidadCuotas(),
      frecuencia: this.frecuencia(),
      fechaPrimeraCuota: this.fechaPrimeraCuota()
    };
    this.dialogRef.close(credito);
  }
}
