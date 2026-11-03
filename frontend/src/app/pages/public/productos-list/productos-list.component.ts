import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { PublicApiService } from '../../../services/public-api.service';
import { SeoService } from '../../../services/seo.service';
import { ProductoCardComponent } from '../../../components/producto-card/producto-card.component';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    ProductoCardComponent
  ],
  template: `
    <div class="page-container">
      
      <!-- HEADER CATEGORÍA -->
      <div class="page-header">
        <h1>{{ tituloPagina() }}</h1>
        <p class="results-count">{{ totalItems() }} resultados</p>
      </div>

      <div class="catalog-layout">
        
        <!-- SIDEBAR FILTROS -->
        <aside class="sidebar hidden-mobile">
          <h3>Categorías</h3>
          <mat-nav-list>
            <a mat-list-item (click)="setCategoria('')" [class.active-cat]="!categoriaSeleccionada()">
              Todas las categorías
            </a>
            @for (cat of categorias(); track cat.id) {
              <a mat-list-item (click)="setCategoria(cat.slug)" [class.active-cat]="categoriaSeleccionada() === cat.slug">
                {{ cat.nombre }}
              </a>
            }
          </mat-nav-list>
        </aside>

        <!-- MAIN GRID -->
        <div class="main-content">
          <!-- Categorías en celular (el sidebar se oculta en pantallas chicas) -->
          @if (categorias().length > 0) {
            <nav class="cat-chips" aria-label="Categorías">
              <button type="button" class="cat-chip" [class.active]="!categoriaSeleccionada()" (click)="setCategoria('')">Todas</button>
              @for (cat of categorias(); track cat.id) {
                <button type="button" class="cat-chip" [class.active]="categoriaSeleccionada() === cat.slug" (click)="setCategoria(cat.slug)">
                  {{ cat.nombre }}
                </button>
              }
            </nav>
          }

          @if (isLoading()) {
            <div class="loading-shade">
              <mat-spinner diameter="50"></mat-spinner>
            </div>
          }

          @if (!isLoading() && productos().length === 0) {
            <div class="empty-state">
              <mat-icon>search_off</mat-icon>
              <h3>No se encontraron productos</h3>
              <p>Intenta con otra búsqueda o filtro.</p>
              <button mat-button color="primary" (click)="limpiarFiltros()">Ver todos los productos</button>
            </div>
          }

          <div class="productos-grid">
            @for (prod of productos(); track prod.id) {
              <app-producto-card [producto]="prod"></app-producto-card>
            }
          </div>

          @if (productos().length > 0) {
            <div class="pagination-wrapper">
              <mat-paginator 
                [length]="totalItems()"
                [pageSize]="pageSize()"
                [pageSizeOptions]="[12, 24, 48]"
                (page)="onPageChange($event)">
              </mat-paginator>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    
    .page-header {
      margin-bottom: 32px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 16px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 2rem;
      color: #0f172a;
      text-transform: capitalize;
    }
    .results-count {
      color: #64748b;
      margin: 8px 0 0 0;
    }

    .catalog-layout {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }

    .sidebar {
      flex: 0 0 250px;
      background: white;
      border-radius: 8px;
      padding: 16px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: sticky;
      top: 90px;
    }
    .sidebar h3 {
      margin: 0 0 8px 16px;
      font-weight: 600;
      color: #1e293b;
      text-transform: uppercase;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .active-cat {
      background: #e0f2fe !important;
      color: #0284c7 !important;
      font-weight: 600;
      border-right: 3px solid #0284c7;
    }

    .main-content {
      flex: 1;
      min-width: 0;
      position: relative;
    }

    .productos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
    }

    .loading-shade {
      display: flex;
      justify-content: center;
      padding: 60px 0;
    }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      background: white;
      border-radius: 12px;
    }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; }
    .empty-state h3 { font-size: 1.5rem; margin-bottom: 8px; color: #334155; }
    .empty-state p { color: #64748b; margin-bottom: 24px; }

    .pagination-wrapper {
      margin-top: 48px;
      display: flex;
      justify-content: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .cat-chips { display: none; }
    @media (max-width: 768px) {
      .cat-chips {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
        margin-bottom: 12px;
        scrollbar-width: none;
      }
      .cat-chip {
        flex-shrink: 0;
        padding: 6px 14px;
        border-radius: 100px;
        border: 1px solid var(--border-dim, rgba(255,255,255,0.15));
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .cat-chip.active { background: var(--signal, #1e6bff); border-color: transparent; color: #fff; }
      .catalog-layout { flex-direction: column; }
      .sidebar { display: none; }
    }
  `]
})
export class ProductosListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(PublicApiService);
  private seo = inject(SeoService);

  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  
  totalItems = signal(0);
  pageSize = signal(12);
  pageIndex = signal(0);
  isLoading = signal(true);
  
  categoriaSeleccionada = signal<string>('');
  searchQuery = signal<string>('');
  
  tituloPagina = signal('Catálogo de Productos');

  ngOnInit() {
    this.api.getCategorias().subscribe({
      next: (res) => {
        this.categorias.set(res.data || []);
        this.actualizarSEO();
      }
    });

    this.route.queryParams.subscribe(params => {
      const cat = params['categoria'] || '';
      const search = params['search'] || '';
      const page = params['page'] ? +params['page'] - 1 : 0;

      this.categoriaSeleccionada.set(cat);
      this.searchQuery.set(search);
      this.pageIndex.set(page);

      this.actualizarSEO();
      this.cargarProductos();
    });
  }

  cargarProductos() {
    this.isLoading.set(true);
    
    this.api.getProductos(
      this.pageIndex() + 1, 
      this.pageSize(), 
      this.categoriaSeleccionada(), 
      this.searchQuery()
    ).subscribe({
      next: (res) => {
        this.productos.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  actualizarSEO() {
    let title = 'Catálogo';
    let desc = 'Explora nuestro catálogo completo de productos tecnológicos.';
    
    const nombreCategoria = this.categorias().find((c) => c.slug === this.categoriaSeleccionada())?.nombre;
    if (this.searchQuery()) {
      title = nombreCategoria
        ? `Resultados para "${this.searchQuery()}" en ${nombreCategoria}`
        : `Resultados para "${this.searchQuery()}"`;
    } else if (this.categoriaSeleccionada()) {
      const slug = this.categoriaSeleccionada();
      title = this.categorias().find((c) => c.slug === slug)?.nombre || slug.replace(/-/g, ' ');
      desc = `Encuentra los mejores precios en ${title}.`;
    }
    
    this.tituloPagina.set(title);
    this.seo.setSeoData(title, desc);
  }

  // Cambiar de categoría mantiene la búsqueda escrita: así se puede buscar
  // "samsung" y después quedarse solo con Celulares.
  setCategoria(slug: string) {
    this.router.navigate(['/productos'], {
      queryParams: { categoria: slug || null, page: null, search: this.searchQuery() || null }
    });
  }

  limpiarFiltros() {
    this.router.navigate(['/productos']);
  }

  onPageChange(event: PageEvent) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: event.pageIndex + 1 },
      queryParamsHandling: 'merge'
    });
  }
}
