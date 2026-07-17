import { Component, ElementRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
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
            <div class="carousel-wrapper">
              @if (totalImagenes() > 1) {
                <button type="button" class="carousel-arrow carousel-arrow--prev" (click)="irASlide(indiceActivo() - 1)" aria-label="Imagen anterior">
                  <mat-icon>chevron_left</mat-icon>
                </button>
              }

              <div class="carousel-track" #carouselTrack (scroll)="onCarouselScroll()">
                @if (totalImagenes() > 0) {
                  @for (img of producto().imagenes; track img; let i = $index) {
                    <div class="carousel-slide">
                      <img [src]="img" [alt]="producto().nombre + ' - foto ' + (i + 1)" loading="lazy">
                    </div>
                  }
                } @else {
                  <div class="carousel-slide">
                    <img src="assets/producto-ejemplo.jpeg" [alt]="producto().nombre" loading="lazy">
                  </div>
                }
              </div>

              @if (totalImagenes() > 1) {
                <button type="button" class="carousel-arrow carousel-arrow--next" (click)="irASlide(indiceActivo() + 1)" aria-label="Imagen siguiente">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              }
            </div>

            @if (totalImagenes() > 1) {
              <div class="carousel-dots">
                @for (img of producto().imagenes; track img; let i = $index) {
                  <button type="button" class="dot" [class.active]="i === indiceActivo()"
                          (click)="irASlide(i)" [attr.aria-label]="'Ir a la imagen ' + (i + 1)"></button>
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
    /* "1fr" es en realidad minmax(auto, 1fr): sin esto, el mínimo automático
       de la celda toma el ancho de su contenido más ancho (acá, el carrusel)
       y desborda la grilla entera en pantallas angostas. */
    .product-layout > * {
      min-width: 0;
    }

    /* Galería */
    .product-gallery {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: sticky;
      top: 100px;
      min-width: 0;
    }
    /* Carrusel: scroll-snap nativo, sin JS de terceros. Cada slide ocupa el
       100% del ancho visible y encastra al centro; las flechas y los dots
       solo desplazan el scroll del track, no manejan el swipe táctil (eso
       lo resuelve el navegador solo). */
    .carousel-wrapper {
      position: relative;
    }
    .carousel-track {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      gap: 1rem;
      background: var(--slate);
      border-radius: 16px;
      border: 1px solid var(--border-dim);
      aspect-ratio: 1;
      min-width: 0;
      width: 100%;

      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .carousel-track::-webkit-scrollbar {
      display: none;
    }
    .carousel-slide {
      flex: 0 0 100%;
      scroll-snap-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }
    .carousel-slide img { max-width: 100%; max-height: 100%; object-fit: contain; }

    .carousel-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--border-dim);
      background: rgba(8, 8, 15, 0.7);
      color: var(--signal);
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .carousel-arrow:hover { background: rgba(0, 174, 239, 0.15); border-color: var(--signal); }
    .carousel-arrow--prev { left: 12px; }
    .carousel-arrow--next { right: 12px; }

    .carousel-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .dot {
      width: 8px;
      height: 8px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--border-dim);
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.15s ease;
    }
    .dot.active {
      background: var(--signal);
      transform: scale(1.3);
    }

    /* Info */
    .breadcrumb { margin-bottom: 16px; font-size: 0.9rem; }
    .cat-link { color: var(--signal); cursor: pointer; text-transform: uppercase; font-weight: 600; }
    .cat-link:hover { text-decoration: underline; }

    .product-title { margin: 0 0 24px 0; font-size: 2.5rem; font-weight: 700; color: var(--white); line-height: 1.2; }

    .price-section { margin-bottom: 24px; }
    .price { display: block; font-size: 3rem; font-weight: 800; color: var(--signal); }
    .installments { color: var(--success); font-weight: 500; font-size: 1rem; }

    .stock-status { margin-bottom: 32px; font-size: 1.1rem; font-weight: 500; }
    .in-stock { color: var(--success); display: flex; align-items: center; gap: 8px; }
    .out-stock { color: var(--danger); display: flex; align-items: center; gap: 8px; }

    .actions { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .btn-block { width: 100%; padding: 12px 0; font-size: 1.1rem; border-radius: 8px; }

    .features-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .feat { display: flex; align-items: center; gap: 12px; color: var(--ash); }
    .feat mat-icon { color: var(--signal); }

    .description-section h3 { font-size: 1.5rem; margin-bottom: 16px; color: var(--white); border-bottom: 1px solid var(--border-dim); padding-bottom: 8px; }
    .desc-text { color: var(--ash); line-height: 1.8; font-size: 1.05rem; }

    .error-state { text-align: center; padding: 100px 24px; }
    .error-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--ash); margin-bottom: 16px; }
    .error-state h2 { color: var(--white); }

    @media (max-width: 900px) {
      .product-layout { grid-template-columns: 1fr; gap: 40px; }
      .product-title { font-size: 2rem; }
      .product-gallery { position: static; }
    }
    @media (max-width: 480px) {
      .price { font-size: 2.1rem; }
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

  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  producto = signal<any>(null);
  isLoading = signal(true);

  indiceActivo = signal(0);
  totalImagenes = computed(() => this.producto()?.imagenes?.length ?? 0);

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
        this.indiceActivo.set(0);

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

  private anchoDeSlide(): number {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return 0;
    const primerSlide = track.querySelector('.carousel-slide') as HTMLElement | null;
    if (!primerSlide) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    return primerSlide.offsetWidth + gap;
  }

  irASlide(index: number) {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return;

    const destino = Math.max(0, Math.min(index, this.totalImagenes() - 1));
    track.scrollTo({ left: destino * this.anchoDeSlide(), behavior: 'smooth' });
    this.indiceActivo.set(destino);
  }

  onCarouselScroll() {
    const track = this.carouselTrack?.nativeElement;
    const ancho = this.anchoDeSlide();
    if (!track || ancho === 0) return;

    this.indiceActivo.set(Math.round(track.scrollLeft / ancho));
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
