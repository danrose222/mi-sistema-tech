import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PublicApiService } from '../../../services/public-api.service';
import { SeoService } from '../../../services/seo.service';
import { CarritoService } from '../../../services/carrito.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      @if (isLoading()) {
        <div class="loading-shade">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else if (producto()) {
        <div class="product-layout">
          
          <!-- Galería -->
          <div class="product-gallery">
            <div class="main-image">
              <img [src]="imagenSeleccionada()" [alt]="producto().nombre" loading="lazy">
            </div>
            @if (producto().imagenes && producto().imagenes.length > 1) {
              <div class="thumbnails">
                @for (img of producto().imagenes; track img) {
                  <div class="thumbnail" 
                       [class.active]="img === imagenSeleccionada()"
                       (click)="imagenSeleccionada.set(img)">
                    <img [src]="img" alt="Thumbnail">
                  </div>
                }
              </div>
            }
          </div>

          <!-- Info y Actions -->
          <div class="product-info">
            @if (producto()?.categoria_nombre) {
              <div class="breadcrumb">
                <span class="cat-link" (click)="irCategoria()">{{ producto()?.categoria_nombre }}</span>
              </div>
            }
            
            <h1 class="product-title">{{ producto().nombre }}</h1>
            
            <div class="price-section">
              <span class="price">{{ producto().precio | currency:'ARS' }}</span>
              <span class="installments">Mismo precio en 3 o 6 cuotas con tu tarjeta</span>
            </div>

            <div class="stock-status">
              @if (producto().stock > 0) {
                <span class="in-stock"><mat-icon inline>check_circle</mat-icon> ¡Hay stock disponible!</span>
              } @else {
                <span class="out-stock"><mat-icon inline>cancel</mat-icon> Sin stock temporalmente</span>
              }
            </div>

            <div class="actions">
              <button mat-flat-button color="primary" class="btn-block" 
                      [disabled]="producto().stock <= 0"
                      (click)="comprarAhora()">
                COMPRAR AHORA
              </button>
              <button mat-stroked-button color="primary" class="btn-block"
                      [disabled]="producto().stock <= 0"
                      (click)="agregarCarrito()">
                AGREGAR AL CARRITO
              </button>
            </div>

            <div class="features-list">
              <div class="feat"><mat-icon>local_shipping</mat-icon> <span>Envío gratis a todo el país</span></div>
              <div class="feat"><mat-icon>verified</mat-icon> <span>Garantía oficial de 12 meses</span></div>
              <div class="feat"><mat-icon>assignment_return</mat-icon> <span>Devolución gratis por 30 días</span></div>
            </div>

            <div class="description-section">
              <h3>Descripción del Producto</h3>
              <div class="desc-text" [innerHTML]="formatearDescripcion(producto().descripcion)"></div>
            </div>
          </div>
        </div>
      } @else {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <h2>Producto no encontrado</h2>
          <button mat-button routerLink="/productos">Volver al catálogo</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 48px 24px;
    }
    .loading-shade { display: flex; justify-content: center; padding: 100px 0; }
    
    .product-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: start;
    }

    /* Galería */
    .product-gallery {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: sticky;
      top: 100px;
    }
    .main-image {
      background: white;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      border: 1px solid #e2e8f0;
    }
    .main-image img { max-width: 100%; max-height: 100%; object-fit: contain; }
    
    .thumbnails {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .thumbnail {
      width: 80px; height: 80px;
      background: white;
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .thumbnail.active { border-color: #0284c7; }
    .thumbnail img { max-width: 100%; max-height: 100%; object-fit: contain; }

    /* Info */
    .breadcrumb { margin-bottom: 16px; font-size: 0.9rem; }
    .cat-link { color: #0284c7; cursor: pointer; text-transform: uppercase; font-weight: 600; }
    .cat-link:hover { text-decoration: underline; }

    .product-title { margin: 0 0 24px 0; font-size: 2.5rem; font-weight: 700; color: #0f172a; line-height: 1.2; }
    
    .price-section { margin-bottom: 24px; }
    .price { display: block; font-size: 3rem; font-weight: 800; color: #1e293b; }
    .installments { color: #16a34a; font-weight: 500; font-size: 1rem; }

    .stock-status { margin-bottom: 32px; font-size: 1.1rem; font-weight: 500; }
    .in-stock { color: #16a34a; display: flex; align-items: center; gap: 8px; }
    .out-stock { color: #dc2626; display: flex; align-items: center; gap: 8px; }

    .actions { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .btn-block { width: 100%; padding: 12px 0; font-size: 1.1rem; border-radius: 8px; }

    .features-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .feat { display: flex; align-items: center; gap: 12px; color: #475569; }
    .feat mat-icon { color: #0284c7; }

    .description-section h3 { font-size: 1.5rem; margin-bottom: 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .desc-text { color: #475569; line-height: 1.8; font-size: 1.05rem; }

    .error-state { text-align: center; padding: 100px 24px; }
    .error-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; }

    @media (max-width: 900px) {
      .product-layout { grid-template-columns: 1fr; gap: 40px; }
      .product-title { font-size: 2rem; }
      .product-gallery { position: static; }
    }
  `]
})
export class ProductoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(PublicApiService);
  private seo = inject(SeoService);
  private carrito = inject(CarritoService);
  private snackBar = inject(MatSnackBar);

  producto = signal<any>(null);
  imagenSeleccionada = signal<string>('');
  isLoading = signal(true);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.cargarProducto(slug);
      }
    });
  }

  cargarProducto(slug: string) {
    this.isLoading.set(true);
    this.api.getProductoBySlug(slug).subscribe({
      next: (res) => {
        const prod = res.data;
        this.producto.set(prod);
        this.imagenSeleccionada.set(prod.imagenes?.[0] || 'assets/producto-ejemplo.jpeg');
        
        // SSR / SEO CRÍTICO: Inyectar meta tags para que google indexe este producto.
        this.seo.setSeoData(
          prod.nombre,
          prod.descripcion?.substring(0, 160) || `Comprá ${prod.nombre} al mejor precio.`,
          prod.imagenes?.[0]
        );

        this.isLoading.set(false);
      },
      error: () => {
        this.seo.setSeoData('Producto no encontrado', 'El producto que buscas no existe.');
        this.isLoading.set(false);
      }
    });
  }

  irCategoria() {
    const categoria = this.producto()?.categoria_nombre;
    if (!categoria) return;
    this.router.navigate(['/productos'], { queryParams: { categoria: categoria.toLowerCase() } });
  }

  agregarCarrito() {
    this.carrito.agregar(this.producto(), 1);
    this.snackBar.open('¡Agregado al carrito!', 'Ver', { duration: 4000 })
      .onAction().subscribe(() => this.router.navigate(['/carrito']));
  }

  comprarAhora() {
    this.carrito.agregar(this.producto(), 1);
    this.router.navigate(['/checkout']);
  }

  formatearDescripcion(text: string): string {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  }
}
