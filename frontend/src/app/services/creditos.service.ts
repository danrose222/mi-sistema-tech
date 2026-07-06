import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cuota {
  id: number;
  credito_id: number;
  numero_cuota: number;
  monto: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  estado: string;
  fecha_pago: string | null;
  pago_id: number | null;
}

export interface Credito {
  id: number;
  cliente_id: number;
  cliente_nombre?: string;
  pedido_id: number | null;
  monto_total: number;
  cantidad_cuotas: number;
  frecuencia: string;
  monto_cuota: number;
  fecha_primera_cuota: string;
  estado: string;
  notas: string;
  created_at: string;
  cuotas?: Cuota[];
}

export interface CreditosResponse {
  success: boolean;
  data: Credito[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CreditosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/creditos';

  listar(page: number = 1, limit: number = 20, estado?: string, clienteId?: number): Observable<CreditosResponse> {
    let params = new HttpParams()
      .set('pagina', page.toString())
      .set('porPagina', limit.toString());
      
    if (estado && estado !== 'todos') {
      params = params.set('estado', estado);
    }
    if (clienteId) {
      params = params.set('clienteId', clienteId.toString());
    }
    
    return this.http.get<CreditosResponse>(this.apiUrl, { params });
  }

  obtenerDetalle(id: number): Observable<{success: boolean, data: Credito}> {
    return this.http.get<{success: boolean, data: Credito}>(`${this.apiUrl}/${id}`);
  }

  crear(data: any): Observable<{success: boolean, data: Credito}> {
    return this.http.post<{success: boolean, data: Credito}>(this.apiUrl, data);
  }

  pagarCuota(creditoId: number, cuotaId: number, monto: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${creditoId}/cuotas/${cuotaId}/pagar`, { monto });
  }

  obtenerVencidas(): Observable<any> {
    return this.http.get(`/api/cuotas/vencidas`);
  }
}
