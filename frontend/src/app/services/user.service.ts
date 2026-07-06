const API_BASE = '/api';

export class UserService {
  static async create(payload: any, token?: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error creating user');
    }
    return res.json();
  }

  static async list(token?: string) {
    const res = await fetch(`/api/admin/usuarios`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error fetching users');
    return res.json();
  }

  static async remove(id: number, token?: string) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!res.ok) throw new Error('Error deleting user');
    return res.json();
  }
}
