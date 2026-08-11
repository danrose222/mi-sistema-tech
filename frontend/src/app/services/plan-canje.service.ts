import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EstadoPlanCanje = 'pendiente_revision' | 'tasado' | 'aceptado' | 'rechazado' | 'completado';
export type CondicionEquipo = 'excelente' | 'bueno' | 'regular' | 'malo';
export type CondicionEquipoEntregado = 'nuevo' | 'usado';
export type CondicionPagoDiferencia = 'efectivo' | 'mercado_pago' | 'transferencia' | 'financiado';

export interface PlanCanje {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_dni: string | null;
  equipo_marca: string;
  equipo_modelo: string;
  equipo_capacidad: string | null;
  equipo_estado_general: CondicionEquipo;
  valor_tasado: number | null;
  estado: EstadoPlanCanje;
  pedido_id: number | null;
  equipo_entregado_condicion: CondicionEquipoEntregado | null;
  equipo_entregado_marca: string | null;
  equipo_entregado_modelo: string | null;
  condicion_pago_diferencia: CondicionPagoDiferencia | null;
  created_at: string;
}

export interface PlanCanjeResponse {
  success: boolean;
  data: PlanCanje[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlanCanjeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/plan-canje';

  listar(page: number = 1, limit: number = 20, estado: string = ''): Observable<PlanCanjeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PlanCanjeResponse>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<{ success: boolean; data: PlanCanje }> {
    return this.http.get<{ success: boolean; data: PlanCanje }>(`${this.apiUrl}/${id}`);
  }

  crear(data: Partial<PlanCanje>): Observable<{ success: boolean; data: PlanCanje }> {
    return this.http.post<{ success: boolean; data: PlanCanje }>(this.apiUrl, data);
  }

  actualizar(id: number, data: Partial<PlanCanje>): Observable<{ success: boolean; data: PlanCanje }> {
    return this.http.put<{ success: boolean; data: PlanCanje }>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }
}
