export interface StockMovimiento {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  tipo: string;
  nota: string;
  created_at: string;
}

export interface ProductoStock {
  id: number;
  nombre: string;
  stock: number;
}

const API_BASE = '/api';

export class StockService {
  static async listarMovimientos(): Promise<StockMovimiento[]> {
    const res = await fetch(`${API_BASE}/stock/movimientos`);
    if (!res.ok) throw new Error('Error al cargar movimientos de stock');
    return res.json();
  }

  static async ajustarStock(payload: {
    producto_id: number;
    cantidad: number;
    tipo: 'ingreso' | 'egreso' | 'ajuste';
    nota?: string;
  }): Promise<{ movimiento_id: number; producto: ProductoStock }> {
    const res = await fetch(`${API_BASE}/stock/ajustar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Error al ajustar stock');
    }
    return res.json();
  }

  static async buscarProductoPorBarcode(barcode: string): Promise<ProductoStock> {
    const res = await fetch(`${API_BASE}/productos/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) {
      throw new Error('Producto no encontrado');
    }
    return res.json();
  }
}
