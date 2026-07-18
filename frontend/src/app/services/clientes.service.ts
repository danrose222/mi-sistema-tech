import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id: number;
  nombre: string;
  dni: string | null;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
  historial_crediticio: string;
  deuda_historica: number;
  created_at: string;
}

export type EstadoCrediticio = 'moroso' | 'al_dia' | 'sin_historial';

export interface ClienteConEstadoCrediticio extends Cliente {
  estado_crediticio: EstadoCrediticio;
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
  private apiUrl = '/api/clientes';

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

  buscarPorDni(dni: string): Observable<{success: boolean, data: ClienteConEstadoCrediticio}> {
    const params = new HttpParams().set('dni', dni);
    return this.http.get<{success: boolean, data: ClienteConEstadoCrediticio}>(`${this.apiUrl}/buscar`, { params });
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

  pagarDeudaHistorica(id: number, montoPagado: number): Observable<{success: boolean, data: { id: number; deuda_historica: number }}> {
    return this.http.put<{success: boolean, data: { id: number; deuda_historica: number }}>(
      `${this.apiUrl}/${id}/pagar-deuda-historica`,
      { monto_pagado: montoPagado }
    );
  }
}
