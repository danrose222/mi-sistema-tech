import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PedidoItemInput {
  producto_id: number;
  cantidad: number;
  imei_serie?: string | null;
}

export interface PayerInput {
  email: string;
  name?: string;
  phone?: { number: string };
  dni: string;
}

export type MetodoPago = 'mercado_pago' | 'transferencia' | 'efectivo_local' | 'efectivo_pos' | 'credito_local';

export interface DesglosePagoInput {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

export interface CreditoPosInput {
  clienteId: number;
  cantidadCuotas: number;
  frecuencia: 'semanal' | 'mensual';
  fechaPrimeraCuota: string;
}

export interface Financiacion {
  credito_id: number;
  cantidad_cuotas: number;
  monto_por_cuota: number;
  total_financiado: number;
  frecuencia?: 'semanal' | 'mensual';
  estado_credito?: string;
}

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

export type EstadoPedido = 'pendiente' | 'pagado' | 'cancelado' | 'enviado' | 'reembolsado' | 'financiado';

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
  imei_serie?: string | null;
}

export interface PedidoDetalle extends Pedido {
  cliente_email?: string | null;
  items: PedidoItem[];
  financiacion: Financiacion | null;
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

  procesarDevolucion(id: number): Observable<{ success: boolean; data: { id: number; estado: EstadoPedido } }> {
    return this.http.post<{ success: boolean; data: { id: number; estado: EstadoPedido } }>(`${this.apiUrl}/${id}/devolucion`, {});
  }

  crearVentaPos(items: PedidoItemInput[], desglosePago: DesglosePagoInput): Observable<{ pedido_id: number; total: number; vuelto: number }> {
    return this.http.post<{ pedido_id: number; total: number; vuelto: number }>(`${this.apiUrl}/pos`, {
      items,
      desglose_pago: desglosePago
    });
  }

  crearVentaCredito(items: PedidoItemInput[], credito: CreditoPosInput): Observable<{ pedido_id: number; total: number; vuelto: number; financiacion: Financiacion }> {
    return this.http.post<{ pedido_id: number; total: number; vuelto: number; financiacion: Financiacion }>(`${this.apiUrl}/pos`, {
      items,
      metodo_pago: 'credito_local',
      credito
    });
  }
}
