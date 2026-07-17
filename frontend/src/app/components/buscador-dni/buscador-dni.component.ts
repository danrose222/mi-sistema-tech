import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ClientesService, ClienteConEstadoCrediticio } from '../../services/clientes.service';
import { ClienteDetalleComponent } from '../../pages/clientes/cliente-detalle/cliente-detalle.component';

@Component({
  selector: 'app-buscador-dni',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="buscador-dni" (click)="$event.stopPropagation()">
      <div class="buscador-input-wrap">
        <mat-icon class="buscador-icon">badge</mat-icon>
        <input
          type="text"
          inputmode="numeric"
          maxlength="8"
          placeholder="Búsqueda rápida por DNI..."
          [(ngModel)]="dniValue"
          (keyup.enter)="buscar()"
          class="buscador-input">
        @if (isLoading()) {
          <mat-spinner diameter="18" class="buscador-spinner"></mat-spinner>
        }
      </div>

      @if (mostrarResultado()) {
        <div class="resultado-card">
          <button class="cerrar-btn" (click)="cerrar()" aria-label="Cerrar">
            <mat-icon>close</mat-icon>
          </button>

          @if (error(); as msg) {
            <div class="resultado-vacio">
              <mat-icon>person_off</mat-icon>
              <p>{{ msg }}</p>
            </div>
          } @else if (cliente(); as c) {
            <div class="resultado-header">
              <h3>{{ c.nombre }}</h3>
              <span class="badge-credito" [class]="'badge-' + c.estado_crediticio">
                @if (c.estado_crediticio === 'moroso') {
                  <mat-icon>warning</mat-icon> ATENCIÓN: Cliente Moroso
                } @else if (c.estado_crediticio === 'al_dia') {
                  <mat-icon>check_circle</mat-icon> Cliente Al Día
                } @else {
                  <mat-icon>help_outline</mat-icon> Sin Historial Crediticio
                }
              </span>
            </div>

            <div class="resultado-datos">
              <div class="dato-row"><mat-icon>call</mat-icon> {{ c.telefono || 'Sin teléfono registrado' }}</div>
              @if (c.email) {
                <div class="dato-row"><mat-icon>mail</mat-icon> {{ c.email }}</div>
              }
            </div>

            <div class="resultado-acciones">
              <button mat-stroked-button (click)="verPerfil(c.id)">
                <mat-icon>person</mat-icon> Ver Perfil
              </button>
              @if (c.estado_crediticio === 'moroso') {
                <button mat-flat-button color="warn" (click)="cobrarDeuda()">
                  <mat-icon>payments</mat-icon> Cobrar Deuda
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .buscador-dni {
      position: relative;
    }
    .buscador-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--void);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      padding: 0 10px;
      height: 38px;
      width: 260px;
    }
    .buscador-input-wrap:focus-within {
      border-color: var(--signal);
    }
    .buscador-icon {
      color: var(--ash);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .buscador-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--white);
      font-size: 0.9rem;
      font-family: var(--font-body);
    }
    .buscador-input::placeholder {
      color: var(--ash);
    }
    .buscador-spinner {
      flex-shrink: 0;
    }

    .resultado-card {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      padding: 20px;
      z-index: 500;
      color: #334155;
    }
    .cerrar-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }
    .cerrar-btn:hover {
      background: #f1f5f9;
      color: #334155;
    }
    .resultado-vacio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 4px 4px;
      color: #64748b;
      text-align: center;
    }
    .resultado-vacio mat-icon {
      color: #cbd5e1;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .resultado-header h3 {
      margin: 0 0 10px;
      font-size: 1.05rem;
      color: #1e293b;
      padding-right: 24px;
    }
    .badge-credito {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 14px;
    }
    .badge-credito mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .badge-credito.badge-moroso { background: #fee2e2; color: #b91c1c; }
    .badge-credito.badge-al_dia { background: #dcfce7; color: #15803d; }
    .badge-credito.badge-sin_historial { background: #f1f5f9; color: #64748b; }
    .resultado-datos {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
    .dato-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
    }
    .dato-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }
    .resultado-acciones {
      display: flex;
      gap: 8px;
    }
    .resultado-acciones button {
      flex: 1;
    }

    @media (max-width: 768px) {
      .buscador-input-wrap { width: 170px; }
    }
  `]
})
export class BuscadorDniComponent {
  private clientesService = inject(ClientesService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  dniValue = '';
  isLoading = signal(false);
  mostrarResultado = signal(false);
  cliente = signal<ClienteConEstadoCrediticio | null>(null);
  error = signal<string | null>(null);

  // Cierra la tarjeta flotante al hacer click fuera. El stopPropagation en el
  // template evita que los clicks dentro del propio buscador lleguen acá.
  @HostListener('document:click')
  onDocumentClick() {
    this.mostrarResultado.set(false);
  }

  buscar() {
    const dni = this.dniValue.trim();
    if (!dni || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.cliente.set(null);

    this.clientesService.buscarPorDni(dni).subscribe({
      next: (res) => {
        this.cliente.set(res.data);
        this.isLoading.set(false);
        this.mostrarResultado.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mostrarResultado.set(true);
        this.error.set(err?.status === 404 ? 'No se encontró ningún cliente con ese DNI' : 'Error al buscar el cliente');
      }
    });
  }

  cerrar() {
    this.mostrarResultado.set(false);
  }

  verPerfil(clienteId: number) {
    this.mostrarResultado.set(false);
    this.dialog.open(ClienteDetalleComponent, { width: '650px', data: { clienteId } });
  }

  cobrarDeuda() {
    this.mostrarResultado.set(false);
    this.router.navigate(['/admin/creditos']);
  }
}
