import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductoPublico {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria_id: number;
  categoria_nombre: string;
  imagenes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PublicApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/publico';

  getProductos(page: number = 1, limit: number = 20, categoria?: string, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (categoria) params = params.set('categoria', categoria);
    if (search) params = params.set('search', search);

    // Endpoint mockeado de acuerdo a los requerimientos
    return this.http.get(`${this.apiUrl}/productos`, { params });
  }

  getProductoBySlug(slug: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/productos/${slug}`);
  }

  getCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias`);
  }
}
