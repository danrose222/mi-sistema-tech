import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

export interface AuthResponse {
  token: string;
  usuario: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  
  // Signals para el estado global y reactivo de autenticación
  public currentUser = signal<User | null>(null);
  public token = signal<string | null>(null);

  constructor() {
    this.loadStateFromStorage();
  }

  /**
   * Carga la sesión desde localStorage al iniciar el servicio
   */
  private loadStateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('usuario');

    if (!storedToken || !storedUser) return;

    try {
      const usuario = JSON.parse(storedUser) as User;
      this.token.set(storedToken);
      this.currentUser.set(usuario);
    } catch (err) {
      console.error('Sesión inválida en localStorage, se limpia:', err);
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      this.token.set(null);
      this.currentUser.set(null);
    }
  }

  /**
   * Inicia sesión y guarda el token y usuario (en Signal y LocalStorage)
   */
  login(usernameOrEmail: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { 
      username: usernameOrEmail, 
      password 
    }).pipe(
      tap(response => {
        this.token.set(response.token);
        this.currentUser.set(response.usuario);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('usuario', JSON.stringify(response.usuario));
        }
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  getToken(): string | null {
    return this.token();
  }
}
