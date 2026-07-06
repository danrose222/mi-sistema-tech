import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h2>Productos</h2>
      <form (ngSubmit)="create()" class="create-form">
        <input [(ngModel)]="newProduct.nombre" name="nombre" placeholder="Nombre" required />
        <input [(ngModel)]="newProduct.precio" name="precio" placeholder="Precio" type="number" required />
        <input [(ngModel)]="newProduct.barcode" name="barcode" placeholder="Barcode" />
        <button type="submit">Crear</button>
      </form>

      <table class="productos-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Barcode</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of displayedProducts">
            <td>{{ p.id }}</td>
            <td>{{ p.nombre }}</td>
            <td>{{ p.precio }}</td>
            <td>{{ p.stock }}</td>
            <td>{{ p.barcode || '-' }}</td>
            <td>
              <button (click)="remove(p.id)">Borrar</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" *ngIf="productos.length > pageSize">
        <button (click)="prevPage()" [disabled]="currentPage===1">Anterior</button>
        <button *ngFor="let n of [].constructor(totalPages); let i = index" (click)="goToPage(i+1)" [class.active]="currentPage===i+1">{{ i+1 }}</button>
        <button (click)="nextPage()" [disabled]="currentPage===totalPages">Siguiente</button>
      </div>
    </section>
  `
})
export class AdminProductsComponent {
  // paginación simple en el cliente
  productos: any[] = [];
  pageSize = 10;
  currentPage = 1;

  newProduct: any = { nombre: '', precio: 0, barcode: '' };

  get totalPages() {
    return Math.max(1, Math.ceil(this.productos.length / this.pageSize));
  }

  get displayedProducts() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.productos.slice(start, start + this.pageSize);
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const token = AuthService.getToken();
    try {
      this.productos = await ProductService.list(token);
      if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    } catch (err) {
      alert('Error cargando productos');
    }
  }

  async create() {
    const token = AuthService.getToken();
    try {
      await ProductService.create(this.newProduct, token);
      this.newProduct = { nombre: '', precio: 0, barcode: '' };
      await this.load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creando producto');
    }
  }

  async remove(id: number) {
    const token = AuthService.getToken();
    try {
      await ProductService.remove(id, token);
      await this.load();
    } catch (err) {
      alert('Error borrando producto');
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(n: number) {
    if (n >= 1 && n <= this.totalPages) this.currentPage = n;
  }
}
