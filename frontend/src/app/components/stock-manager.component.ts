import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService, StockMovimiento, ProductoStock } from '../services/stock.service';
import { BarcodeScannerComponent } from './barcode-scanner.component';

@Component({
  selector: 'app-stock-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScannerComponent],
  template: `
    <section class="stock-page">
      <h1>Gestión de Stock</h1>

      <form (ngSubmit)="onSubmit()" class="stock-form">
        <label>
          Producto ID
          <input type="number" [(ngModel)]="productoId" name="productoId" required />
        </label>

        <label>
          Cantidad
          <input type="number" [(ngModel)]="cantidad" name="cantidad" required />
        </label>

        <label>
          Tipo
          <select [(ngModel)]="tipo" name="tipo" required>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </label>

        <label>
          Nota
          <input type="text" [(ngModel)]="nota" name="nota" />
        </label>

        <button type="submit">Ajustar stock</button>
      </form>

      <section class="scanner-section">
        <app-barcode-scanner (barcodeDetected)="onBarcodeDetected($event)"></app-barcode-scanner>
      </section>

      <section class="stock-info" *ngIf="producto">
        <h2>Producto encontrado</h2>
        <p>Nombre: {{ producto.nombre }}</p>
        <p>Stock actual: {{ producto.stock }}</p>
      </section>

      <section class="movimientos" *ngIf="movimientosList.length">
        <h2>Movimientos recientes</h2>
        <ul>
          <li *ngFor="let movimiento of movimientosList">
            {{ movimiento.created_at }} - {{ movimiento.producto_nombre }} - {{ movimiento.tipo }} - {{ movimiento.cantidad }} ({{ movimiento.nota }})
          </li>
        </ul>
      </section>
    </section>
  `,
  styles: [
    `
      .stock-page { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
      .stock-form { display: grid; gap: 1rem; margin-bottom: 1.5rem; }
      .stock-form label { display: grid; gap: 0.5rem; }
      .scanner-section { margin-bottom: 1.5rem; }
      .movimientos ul { list-style: none; padding: 0; }
      .movimientos li { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    `
  ]
})
export class StockManagerComponent {
  productoId = 0;
  cantidad = 1;
  tipo: 'ingreso' | 'egreso' | 'ajuste' = 'ingreso';
  nota = '';
  producto: ProductoStock | null = null;
  movimientos = signal<StockMovimiento[]>([]);

  get movimientosList() {
    return this.movimientos();
  }

  async ngOnInit() {
    await this.cargarMovimientos();
  }

  async cargarMovimientos() {
    this.movimientos.set(await StockService.listarMovimientos());
  }

  async onSubmit() {
    try {
      const result = await StockService.ajustarStock({
        producto_id: this.productoId,
        cantidad: this.cantidad,
        tipo: this.tipo,
        nota: this.nota || undefined
      });
      this.producto = result.producto;
      await this.cargarMovimientos();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Error al ajustar stock');
    }
  }

  async onBarcodeDetected(barcode: string) {
    try {
      const producto = await StockService.buscarProductoPorBarcode(barcode);
      this.productoId = producto.id;
      this.producto = producto;
    } catch (error) {
      console.error(error);
      alert('Producto no encontrado para barcode: ' + barcode);
    }
  }
}
