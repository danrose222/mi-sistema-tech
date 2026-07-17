import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PedidoItemInput {
  producto_id: number;
  cantidad: number;
}

export interface PayerInput {
  email: string;
  name?: string;
  phone?: { number: string };
}

export type MetodoPago = 'mercado_pago' | 'transferencia' | 'efectivo_local';

export interface CrearPedidoInput {
  cliente_id?: number | null;
  items: PedidoItemInput[];
  payer: PayerInput;
  metodo_pago: MetodoPago;
}

export interface CrearPedidoResponse {
  pedido_id: number;
  metodo_pago: MetodoPago;
  pago_link: string | null;
  preference_id: string | null;
}

export type EstadoPedido = 'pendiente' | 'pagado' | 'cancelado' | 'enviado';

export interface Pedido {
  id: number;
  cliente_id: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  total: number;
  estado: EstadoPedido;
  metodo_pago: MetodoPago;
  pago_link: string | null;
  mercado_pago_preference_id: string | null;
  created_at: string;
}

export interface PedidoItem {
  id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre: string;
}

export interface PedidoDetalle extends Pedido {
  cliente_email?: string | null;
  items: PedidoItem[];
}

export interface PedidosResponse {
  success: boolean;
  data: Pedido[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = '/api/pedidos';

  crear(pedido: CrearPedidoInput): Observable<CrearPedidoResponse> {
    return this.http.post<CrearPedidoResponse>(this.apiUrl, pedido);
  }

  listar(page: number = 1, limit: number = 20, estado: string = ''): Observable<PedidosResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PedidosResponse>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<{ success: boolean; data: PedidoDetalle }> {
    return this.http.get<{ success: boolean; data: PedidoDetalle }>(`${this.apiUrl}/${id}`);
  }

  crearVentaPos(items: PedidoItemInput[]): Observable<{ pedido_id: number; total: number }> {
    return this.http.post<{ pedido_id: number; total: number }>(`${this.apiUrl}/pos`, { items });
  }
}
