import { Component, ElementRef, ViewChild, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-imei-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>IMEI / N° de Serie</h2>
    <mat-dialog-content>
      <p class="producto-nombre">{{ data.productoNombre }}</p>
      <p class="hint">Escaneá el IMEI con el lector láser apuntando acá, o ingresalo manualmente.</p>

      <div class="imei-input-wrap">
        <mat-icon>qr_code_scanner</mat-icon>
        <input
          #imeiInput
          class="imei-input"
          type="text"
          autocomplete="off"
          placeholder="Ingrese el IMEI o Número de Serie"
          (keyup.enter)="confirmar(imeiInput.value)">
      </div>

      @if (error(); as msg) {
        <p class="aviso-error"><mat-icon>error_outline</mat-icon> {{ msg }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar(imeiInput.value)">Confirmar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 380px; padding-top: 8px; }
    .producto-nombre { margin: 0 0 4px; font-weight: 700; font-size: 1rem; color: #0f172a; }
    .hint { margin: 0 0 16px; font-size: 0.85rem; color: #64748b; }

    .imei-input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f0f9ff;
    }
    .imei-input-wrap mat-icon { color: #0ea5e9; flex-shrink: 0; }
    .imei-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1rem;
      color: #0f172a;
    }
    .imei-input::placeholder { color: #94a3b8; }

    .aviso-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0 0;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .aviso-error mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
  `]
})
export class ImeiDialogComponent implements AfterViewInit {
  dialogRef = inject(MatDialogRef<ImeiDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { productoNombre: string };

  @ViewChild('imeiInput') imeiInputRef!: ElementRef<HTMLInputElement>;

  error = signal<string | null>(null);

  ngAfterViewInit() {
    // El lector láser "escribe" en el input que tenga foco: hay que dárselo
    // apenas se abre el dialog, igual que el input de código de barras del POS.
    setTimeout(() => this.imeiInputRef.nativeElement.focus(), 0);
  }

  confirmar(valorCrudo: string) {
    const imei = valorCrudo.trim();
    if (!imei) {
      this.error.set('Ingresá un IMEI o número de serie válido');
      return;
    }
    this.dialogRef.close(imei);
  }
}
