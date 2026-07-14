import { Injectable, signal, PLATFORM_ID, inject, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ItemCarrito {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  slug: string;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private platformId = inject(PLATFORM_ID);
  
  items = signal<ItemCarrito[]>([]);

  // Computed signal para saber cantidad total de items (para el badge del icono)
  totalItems = computed(() => {
    return this.items().reduce((acc, item) => acc + item.cantidad, 0);
  });

  // Computed signal para saber precio total
  totalPrecio = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  });

  constructor() {
    this.cargarLocalStorage();
  }

  private cargarLocalStorage() {
    // Es crítico chequear isPlatformBrowser cuando usamos SSR
    // porque el servidor de Node no tiene window.localStorage
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('carrito_items');
      if (saved) {
        try {
          this.items.set(JSON.parse(saved));
        } catch(e) {}
      }
    }
  }

  private guardarLocalStorage(current: ItemCarrito[]) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('carrito_items', JSON.stringify(current));
    }
  }

  agregar(producto: any, cantidad: number = 1) {
    // `stock` es opcional: si el producto no la trae, no se aplica tope.
    const stockDisponible: number | undefined = producto.stock;

    this.items.update(current => {
      const existing = current.find(item => item.id === producto.id);
      let newItems;
      if (existing) {
        const cantidadDeseada = existing.cantidad + cantidad;
        const cantidadFinal = stockDisponible !== undefined
          ? Math.min(cantidadDeseada, stockDisponible)
          : cantidadDeseada;
        newItems = current.map(item =>
          item.id === producto.id ? { ...item, cantidad: cantidadFinal } : item
        );
      } else {
        const cantidadFinal = stockDisponible !== undefined
          ? Math.min(cantidad, stockDisponible)
          : cantidad;
        newItems = [...current, {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: cantidadFinal,
          imagen: producto.imagenes?.[0] || 'assets/producto-ejemplo.jpeg',
          slug: producto.slug
        }];
      }
      this.guardarLocalStorage(newItems);
      return newItems;
    });
  }

  eliminar(id: number) {
    this.items.update(current => {
      const newItems = current.filter(item => item.id !== id);
      this.guardarLocalStorage(newItems);
      return newItems;
    });
  }

  actualizarCantidad(id: number, cantidad: number) {
    if (cantidad <= 0) {
      this.eliminar(id);
      return;
    }
    
    this.items.update(current => {
      const newItems = current.map(item => 
        item.id === id ? { ...item, cantidad } : item
      );
      this.guardarLocalStorage(newItems);
      return newItems;
    });
  }

  vaciar() {
    this.items.set([]);
    this.guardarLocalStorage([]);
  }
}
