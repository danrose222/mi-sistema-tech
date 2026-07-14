import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StockMovimiento {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  tipo: 'ingreso' | 'egreso' | 'ajuste';
  nota: string;
  created_at: string;
}

export interface ProductoStock {
  id: number;
  nombre: string;
  stock: number;
}

export interface AjustarStockInput {
  producto_id: number;
  cantidad: number;
  tipo: 'ingreso' | 'egreso' | 'ajuste';
  nota?: string;
}

export interface AjustarStockResponse {
  movimiento_id: number;
  producto: ProductoStock;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private http = inject(HttpClient);
  private apiUrl = '/api/stock';

  listarMovimientos(): Observable<StockMovimiento[]> {
    return this.http.get<StockMovimiento[]>(`${this.apiUrl}/movimientos`);
  }

  ajustarStock(payload: AjustarStockInput): Observable<AjustarStockResponse> {
    return this.http.post<AjustarStockResponse>(`${this.apiUrl}/ajustar`, payload);
  }

  buscarProductoPorBarcode(barcode: string): Observable<{ success: boolean; data: ProductoStock }> {
    return this.http.get<{ success: boolean; data: ProductoStock }>(`/api/productos/barcode/${encodeURIComponent(barcode)}`);
  }
}
