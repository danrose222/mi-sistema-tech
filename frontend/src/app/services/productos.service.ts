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
  imagenes?: string[];
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

  importarExcel(archivo: File): Observable<{ success: boolean; data: { creados: number } }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ success: boolean; data: { creados: number } }>(`${this.apiUrl}/importar`, formData);
  }

  descargarPlantillaImportacion(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/importar/plantilla`, { responseType: 'blob' });
  }
}
