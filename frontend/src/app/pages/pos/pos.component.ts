import { Component, ElementRef, AfterViewInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ProductosService, Producto } from '../../services/productos.service';
import { OrderService, CreditoPosInput } from '../../services/order.service';
import { PedidoDetalleComponent } from '../pedidos/pedido-detalle/pedido-detalle.component';
import { PagoMixtoDialogComponent, DesglosePago } from './pago-mixto-dialog/pago-mixto-dialog.component';
import { VentaCreditoDialogComponent } from './venta-credito-dialog/venta-credito-dialog.component';

interface ItemTicket {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="pos-layout">
      <!-- Columna izquierda: lector de código de barras -->
      <div class="lector-panel">
        <h2 class="panel-title">Punto de Venta</h2>
        <label for="pos-barcode-input" class="lector-label">Escanear código de barras</label>
        <input
          #barcodeInput
          id="pos-barcode-input"
          class="lector-input"
          type="text"
          autocomplete="off"
          placeholder="Apuntá el lector acá y escaneá..."
          (keyup.enter)="onScan(barcodeInput.value)">
        <p class="lector-hint">
          <mat-icon>info</mat-icon>
          El cursor vuelve acá solo después de cada lectura. También podés tipear el código y apretar Enter.
        </p>

        @if (ultimoEscaneado(); as ultimo) {
          <div class="ultimo-escaneado" [class.error]="ultimo.error">
            <mat-icon>{{ ultimo.error ? 'error_outline' : 'check_circle' }}</mat-icon>
            <span>{{ ultimo.mensaje }}</span>
          </div>
        }
      </div>

      <!-- Columna derecha: ticket virtual -->
      <div class="ticket-panel">
        <div class="ticket-header">
          <h3>Ticket</h3>
          <button type="button" class="btn-vaciar" [disabled]="ticket().length === 0" (click)="vaciarTicket()">
            <mat-icon>delete_sweep</mat-icon> Vaciar
          </button>
        </div>

        <div class="ticket-tabla-wrapper">
          <table class="ticket-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="col-num">Cant.</th>
                <th class="col-num">P. Unit.</th>
                <th class="col-num">Subtotal</th>
                <th class="col-accion"></th>
              </tr>
            </thead>
            <tbody>
              @for (item of ticket(); track item.productoId) {
                <tr>
                  <td>{{ item.nombre }}</td>
                  <td class="col-num">{{ item.cantidad }}</td>
                  <td class="col-num">{{ item.precioUnitario | currency:'ARS' }}</td>
                  <td class="col-num">{{ (item.precioUnitario * item.cantidad) | currency:'ARS' }}</td>
                  <td class="col-accion">
                    <button type="button" class="btn-quitar" (click)="quitarItem(item.productoId)" aria-label="Quitar producto">
                      <mat-icon>close</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr class="fila-vacia">
                  <td colspan="5">Escaneá un producto para empezar la venta.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="ticket-total">
          <span>Total</span>
          <strong>{{ total() | currency:'ARS' }}</strong>
        </div>

        <button
          type="button"
          class="btn-confirmar"
          [disabled]="ticket().length === 0 || isProcessing()"
          (click)="confirmarVenta()">
          <mat-icon>point_of_sale</mat-icon>
          {{ isProcessing() ? 'Registrando...' : 'Confirmar Venta' }}
        </button>

        <button
          type="button"
          class="btn-credito"
          [disabled]="ticket().length === 0 || isProcessing()"
          (click)="venderACredito()">
          <mat-icon>credit_score</mat-icon>
          Vender a Crédito
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pos-layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 24px;
      height: 100%;
      align-items: start;
    }

    /* ── Panel del lector ─────────────────── */
    .lector-panel {
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 28px;
      position: sticky;
      top: 0;
    }
    .panel-title {
      margin: 0 0 24px;
      color: var(--white);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.4rem;
    }
    .lector-label {
      display: block;
      font-size: 0.8rem;
      color: var(--ash);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 8px;
    }
    .lector-input {
      width: 100%;
      padding: 18px 16px;
      font-size: 1.3rem;
      font-family: var(--font-body);
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid var(--border-dim);
      border-radius: var(--radius-sm);
      color: var(--white);
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .lector-input:focus {
      border-color: var(--signal);
      box-shadow: 0 0 0 3px rgba(0, 174, 239, 0.15);
    }
    .lector-input::placeholder { color: var(--ash); }

    .lector-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 16px 0 0;
      color: var(--ash);
      font-size: 0.8rem;
      line-height: 1.5;
    }
    .lector-hint mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }

    .ultimo-escaneado {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 12px 14px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: var(--radius-sm);
      color: var(--success);
      font-size: 0.85rem;
    }
    .ultimo-escaneado.error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--danger);
    }
    .ultimo-escaneado mat-icon { flex-shrink: 0; }

    /* ── Panel del ticket ─────────────────── */
    .ticket-panel {
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .ticket-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .ticket-header h3 {
      margin: 0;
      color: var(--white);
      font-size: 1.1rem;
      font-weight: 700;
    }
    .btn-vaciar {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid var(--border-dim);
      color: var(--ash);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-vaciar:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
    .btn-vaciar:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-vaciar mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .ticket-tabla-wrapper { overflow-x: auto; min-height: 200px; }
    .ticket-tabla { width: 100%; border-collapse: collapse; }
    .ticket-tabla th {
      text-align: left;
      padding: 10px 24px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ash);
      border-bottom: 1px solid var(--border-dim);
      white-space: nowrap;
    }
    .ticket-tabla td {
      padding: 12px 24px;
      font-size: 0.95rem;
      color: var(--white);
      border-bottom: 1px solid var(--border-dim);
    }
    .col-num { text-align: right; }
    .col-accion { width: 40px; text-align: center; }
    .btn-quitar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--ash);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-quitar:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
    .btn-quitar mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .fila-vacia td { text-align: center; color: var(--ash); padding: 40px 24px; }

    .ticket-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 16px 24px;
      margin: 0 24px;
      background: rgba(0, 174, 239, 0.06);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
    }
    .ticket-total span { color: var(--ash); text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.03em; }
    .ticket-total strong { color: var(--signal); font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; }

    .btn-confirmar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 24px;
      padding: 14px 0;
      background: var(--signal);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 1.05rem;
      font-weight: 700;
      font-family: var(--font-display);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .btn-confirmar:hover:not(:disabled) { background: var(--pulse); }
    .btn-confirmar:disabled { background: rgba(255, 255, 255, 0.08); color: var(--ash); cursor: not-allowed; }

    .btn-credito {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 24px;
      padding: 12px 0;
      background: transparent;
      color: var(--pulse);
      border: 1px solid var(--pulse);
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      font-weight: 700;
      font-family: var(--font-display);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-credito:hover:not(:disabled) { background: rgba(0, 174, 239, 0.08); }
    .btn-credito:disabled { border-color: var(--border-dim); color: var(--ash); cursor: not-allowed; }

    @media (max-width: 900px) {
      .pos-layout { grid-template-columns: 1fr; }
      .lector-panel { position: static; }
    }
  `]
})
export class PosComponent implements AfterViewInit {
  @ViewChild('barcodeInput') barcodeInputRef!: ElementRef<HTMLInputElement>;

  private productosService = inject(ProductosService);
  private orderService = inject(OrderService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ticket = signal<ItemTicket[]>([]);
  isProcessing = signal(false);
  ultimoEscaneado = signal<{ mensaje: string; error: boolean } | null>(null);

  total = computed(() => this.ticket().reduce((suma, item) => suma + item.precioUnitario * item.cantidad, 0));

  ngAfterViewInit() {
    this.enfocarInput();
  }

  private enfocarInput() {
    this.barcodeInputRef?.nativeElement.focus();
  }

  onScan(codigoCrudo: string) {
    // Vaciar y refocalizar de inmediato (no esperar la respuesta HTTP): así
    // el lector puede seguir disparando lecturas una atrás de otra sin que
    // el cajero tenga que volver a clickear el input.
    const input = this.barcodeInputRef.nativeElement;
    input.value = '';
    this.enfocarInput();

    const codigo = codigoCrudo.trim();
    if (!codigo) return;

    this.productosService.buscarPorBarcode(codigo).subscribe({
      next: (res) => this.agregarAlTicket(res.data),
      error: () => {
        this.ultimoEscaneado.set({ mensaje: `No se encontró ningún producto con el código "${codigo}"`, error: true });
        this.snackBar.open(`Código "${codigo}" no encontrado`, 'Cerrar', { duration: 3000 });
      }
    });
  }

  private agregarAlTicket(producto: Producto) {
    if (!producto.activo) {
      this.ultimoEscaneado.set({ mensaje: `"${producto.nombre}" está inactivo, no se puede vender`, error: true });
      this.snackBar.open(`"${producto.nombre}" está inactivo`, 'Cerrar', { duration: 3500 });
      return;
    }

    const yaExiste = this.ticket().some((item) => item.productoId === producto.id);
    if (yaExiste) {
      this.ticket.update((actual) =>
        actual.map((item) => item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      );
    } else {
      this.ticket.update((actual) => [...actual, {
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnitario: Number(producto.precio),
        cantidad: 1
      }]);
    }

    this.ultimoEscaneado.set({ mensaje: `${producto.nombre} agregado al ticket`, error: false });
  }

  quitarItem(productoId: number) {
    this.ticket.update((actual) => actual.filter((item) => item.productoId !== productoId));
  }

  vaciarTicket() {
    this.ticket.set([]);
    this.ultimoEscaneado.set(null);
    this.enfocarInput();
  }

  confirmarVenta() {
    if (this.ticket().length === 0 || this.isProcessing()) return;

    const dialogRef = this.dialog.open(PagoMixtoDialogComponent, {
      width: '440px',
      data: { total: this.total() }
    });

    dialogRef.afterClosed().subscribe((desglosePago: DesglosePago | undefined) => {
      // undefined = se canceló el modal (click afuera, botón Cancelar): el
      // ticket queda intacto, el cajero puede seguir escaneando o reintentar.
      if (!desglosePago) {
        this.enfocarInput();
        return;
      }
      this.registrarVenta(desglosePago);
    });
  }

  venderACredito() {
    if (this.ticket().length === 0 || this.isProcessing()) return;

    const dialogRef = this.dialog.open(VentaCreditoDialogComponent, {
      width: '460px',
      data: { total: this.total() }
    });

    dialogRef.afterClosed().subscribe((credito: CreditoPosInput | undefined) => {
      if (!credito) {
        this.enfocarInput();
        return;
      }
      this.registrarVentaCredito(credito);
    });
  }

  private registrarVentaCredito(credito: CreditoPosInput) {
    this.isProcessing.set(true);

    const items = this.ticket().map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad
    }));

    this.orderService.crearVentaCredito(items, credito).subscribe({
      next: (res) => {
        this.snackBar.open(`Venta a crédito registrada: ${credito.cantidadCuotas} cuotas de ${this.formatearMonto(res.financiacion.monto_por_cuota)}`, 'Cerrar', { duration: 5000 });
        this.ticket.set([]);
        this.ultimoEscaneado.set(null);
        this.isProcessing.set(false);
        this.enfocarInput();

        this.dialog.open(PedidoDetalleComponent, {
          width: '520px',
          data: { pedidoId: res.pedido_id, autoprint: true }
        });
      },
      error: (err) => {
        this.isProcessing.set(false);
        const mensaje = err?.error?.error || 'No se pudo registrar la venta a crédito';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
        this.enfocarInput();
      }
    });
  }

  private registrarVenta(desglosePago: DesglosePago) {
    this.isProcessing.set(true);

    const items = this.ticket().map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad
    }));

    this.orderService.crearVentaPos(items, desglosePago).subscribe({
      next: (res) => {
        const mensaje = res.vuelto > 0
          ? `Venta registrada. Vuelto: ${this.formatearMonto(res.vuelto)}`
          : 'Venta registrada correctamente';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        this.ticket.set([]);
        this.ultimoEscaneado.set(null);
        this.isProcessing.set(false);
        this.enfocarInput();

        this.dialog.open(PedidoDetalleComponent, {
          width: '520px',
          data: { pedidoId: res.pedido_id, autoprint: true }
        });
      },
      error: (err) => {
        this.isProcessing.set(false);
        const mensaje = err?.error?.error || 'No se pudo registrar la venta';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
        this.enfocarInput();
      }
    });
  }

  private formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
  }
}
