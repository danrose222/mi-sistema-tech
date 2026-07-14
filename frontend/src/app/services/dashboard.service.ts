import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResumenDashboard {
  totalClientes: number;
  totalProductos: number;
  productosStockBajo: number;
  pedidosPendientes: number;
  ventasMes: number;
  creditosActivos: number;
  cuotasVencidas: number;
}

export interface DesgloseProductoVendido {
  producto_id: number;
  producto: string;
  cantidad_vendida: number;
  subtotal: number;
}

export interface VentasMes {
  total_recaudado: number;
  total_productos: number;
  desglose: DesgloseProductoVendido[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/dashboard';

  obtenerResumen(): Observable<{ success: boolean; data: ResumenDashboard }> {
    return this.http.get<{ success: boolean; data: ResumenDashboard }>(`${this.apiUrl}/resumen`);
  }

  obtenerVentasMes(): Observable<{ success: boolean; data: VentasMes }> {
    return this.http.get<{ success: boolean; data: VentasMes }>(`${this.apiUrl}/ventas-mes`);
  }
}
