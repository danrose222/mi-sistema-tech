const API_BASE = '/api';

export class OrderService {
  static async list(token?: string) {
    const res = await fetch(`${API_BASE}/pedidos`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error fetching orders');
    return res.json();
  }

  static async get(id: number, token?: string) {
    const res = await fetch(`${API_BASE}/pedidos/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error fetching order');
    return res.json();
  }
}
