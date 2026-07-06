import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
  created_at: string;
}

export interface ClientesResponse {
  success: boolean;
  data: Cliente[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/clientes';

  listar(page: number = 1, limit: number = 20, search: string = ''): Observable<ClientesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<ClientesResponse>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<{success: boolean, data: Cliente}> {
    return this.http.get<{success: boolean, data: Cliente}>(`${this.apiUrl}/${id}`);
  }

  crear(data: Partial<Cliente>): Observable<{success: boolean, data: Cliente}> {
    return this.http.post<{success: boolean, data: Cliente}>(this.apiUrl, data);
  }

  actualizar(id: number, data: Partial<Cliente>): Observable<{success: boolean, data: Cliente}> {
    return this.http.put<{success: boolean, data: Cliente}>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/${id}`);
  }
}
