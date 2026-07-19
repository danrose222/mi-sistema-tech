import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface FilaConError {
  fila: number;
  motivo: string;
}

@Component({
  selector: 'app-importar-errores-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>No se pudo importar el archivo</h2>
    <mat-dialog-content>
      <p class="mensaje-general">{{ data.mensaje }}</p>

      @if (data.errores && data.errores.length > 0) {
        <p class="subtitulo">Corregí estas filas en tu Excel y volvé a subirlo:</p>
        <div class="tabla-errores">
          @for (err of data.errores; track err.fila) {
            <div class="fila-error">
              <span class="numero-fila">Fila {{ err.fila }}</span>
              <span class="motivo">{{ err.motivo }}</span>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 420px; max-width: 520px; }
    .mensaje-general {
      color: #334155;
      margin: 8px 0 0;
    }
    .subtitulo {
      color: #64748b;
      font-size: 0.85rem;
      margin: 16px 0 8px;
    }
    .tabla-errores {
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid #fecaca;
      border-radius: 8px;
    }
    .fila-error {
      display: flex;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid #fecaca;
      background: #fef2f2;
      font-size: 0.85rem;
    }
    .fila-error:last-child { border-bottom: none; }
    .numero-fila {
      flex-shrink: 0;
      font-weight: 700;
      color: #b91c1c;
      min-width: 60px;
    }
    .motivo { color: #7f1d1d; }
  `]
})
export class ImportarErroresDialogComponent {
  dialogRef = inject(MatDialogRef<ImportarErroresDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { mensaje: string; errores?: FilaConError[] };
}
