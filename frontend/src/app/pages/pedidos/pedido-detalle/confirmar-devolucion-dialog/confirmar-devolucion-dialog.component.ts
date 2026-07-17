import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirmar-devolucion-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="icono-alerta">warning</mat-icon>
      Procesar Devolución
    </h2>
    <mat-dialog-content>
      <p>
        <strong>Atención:</strong> esta acción devolverá los productos al stock y registrará el dinero como
        devuelto. ¿Deseas continuar?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Sí, procesar devolución</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 10px; }
    .icono-alerta { color: #d97706; }
    mat-dialog-content p {
      min-width: 380px;
      color: #334155;
      line-height: 1.6;
      font-size: 0.95rem;
    }
    mat-dialog-content strong { color: #b91c1c; }
  `]
})
export class ConfirmarDevolucionDialogComponent {}
