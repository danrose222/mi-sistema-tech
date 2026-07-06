const API_BASE = '/api';

export class ProductService {
  static async list(token?: string) {
    const res = await fetch(`${API_BASE}/productos`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error fetching products');
    return res.json();
  }

  static async create(payload: any, token?: string) {
    const res = await fetch(`${API_BASE}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error creating product');
    return res.json();
  }

  static async remove(id: number, token?: string) {
    const res = await fetch(`${API_BASE}/productos/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error deleting product');
    return res.json();
  }
}
