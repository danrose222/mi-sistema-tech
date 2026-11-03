import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  sku: string;
  barcode: string;
  precio: number;
  stock: number;
  activo: boolean | number;
  requiere_imei: boolean | number;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  destacado?: boolean | number;
  imagenes?: string[];
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  orden: number;
}

export interface ResultadoImportacion {
  creados: number;
  actualizados: number;
}

export interface ResultadoImagenesMasivo {
  productos_actualizados: number;
  imagenes_asignadas: number;
  sin_producto: string[];
}

export interface ProductosResponse {
  success: boolean;
  data: Producto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/productos';

  listar(page: number = 1, limit: number = 20, search: string = ''): Observable<ProductosResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ProductosResponse>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<{ success: boolean; data: Producto }> {
    return this.http.get<{ success: boolean; data: Producto }>(`${this.apiUrl}/${id}`);
  }

  buscarPorBarcode(barcode: string): Observable<{ success: boolean; data: Producto }> {
    return this.http.get<{ success: boolean; data: Producto }>(`${this.apiUrl}/barcode/${encodeURIComponent(barcode)}`);
  }

  // Si hay imagen nueva el form arma un FormData (multipart); si no, sigue
  // mandando el objeto plano de siempre. HttpClient detecta FormData y deja
  // que el browser setee el Content-Type con el boundary correcto: no hay
  // que tocar headers acá.
  crear(data: Partial<Producto> | FormData): Observable<{ success: boolean; data: Producto }> {
    return this.http.post<{ success: boolean; data: Producto }>(this.apiUrl, data);
  }

  actualizar(id: number, data: Partial<Producto> | FormData): Observable<{ success: boolean; data: Producto }> {
    return this.http.put<{ success: boolean; data: Producto }>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  // Las filas con un SKU que ya existe actualizan ese producto en vez de
  // duplicarlo; el resto se crea.
  importarExcel(archivo: File): Observable<{ success: boolean; data: ResultadoImportacion }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ success: boolean; data: ResultadoImportacion }>(`${this.apiUrl}/importar`, formData);
  }

  listarCategorias(): Observable<{ success: boolean; data: Categoria[] }> {
    return this.http.get<{ success: boolean; data: Categoria[] }>(`${this.apiUrl}/categorias`);
  }

  // Cada foto se asigna al producto cuyo SKU es el comienzo del nombre del
  // archivo (ej. "CEL-N-001_frente.jpg" -> SKU "CEL-N-001").
  subirImagenesMasivo(archivos: File[]): Observable<{ success: boolean; data: ResultadoImagenesMasivo }> {
    const formData = new FormData();
    archivos.forEach((archivo) => formData.append('imagenes', archivo));
    return this.http.post<{ success: boolean; data: ResultadoImagenesMasivo }>(`${this.apiUrl}/imagenes/masivo`, formData);
  }

  descargarPlantillaImportacion(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/importar/plantilla`, { responseType: 'blob' });
  }
}
