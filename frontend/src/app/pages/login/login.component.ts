import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule], // Requerido para [(ngModel)]
  template: `
    <div class="login-container">
      <div class="login-box">
        <div class="brand">
          <h2>Mi Sistema Tech</h2>
          <p class="subtitle">Panel Administrativo</p>
        </div>

        @if (errorMsg()) {
          <div class="error-banner">
            {{ errorMsg() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Usuario</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="username" 
              required
              class="form-control"
              placeholder="Ej. admin"
              autofocus
            >
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="password" 
              required
              class="form-control"
              placeholder="••••••••"
            >
          </div>

          <button 
            type="submit" 
            class="btn-login"
            [disabled]="loginForm.invalid || isLoading()"
          >
            {{ isLoading() ? 'Autenticando...' : 'Iniciar Sesión' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      font-family: 'Inter', system-ui, sans-serif;
    }

    .login-box {
      background: white;
      padding: 48px;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 420px;
    }

    .brand {
      text-align: center;
      margin-bottom: 32px;
    }

    h2 {
      margin: 0 0 8px 0;
      color: #0f172a;
      font-size: 1.75rem;
      font-weight: 800;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }

    .error-banner {
      background-color: #fef2f2;
      color: #b91c1c;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      border: 1px solid #fecaca;
    }

    .form-group {
      margin-bottom: 24px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #334155;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
      font-size: 1rem;
      color: #1e293b;
    }

    .form-control:focus {
      border-color: #0ea5e9;
      box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.15);
    }

    .btn-login {
      width: 100%;
      padding: 14px;
      background-color: #0ea5e9;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
    }

    .btn-login:hover:not([disabled]) {
      background-color: #0284c7;
      transform: translateY(-1px);
    }

    .btn-login[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // Uso de Signals para estado local (Angular 21 style)
  username = signal('');
  password = signal('');
  errorMsg = signal('');
  isLoading = signal(false);

  constructor() {
    // Protección directa si el usuario entra a /login pero ya tiene token
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  onSubmit() {
    if (!this.username() || !this.password()) return;
    
    this.isLoading.set(true);
    this.errorMsg.set('');

    this.authService.login(this.username(), this.password()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/dashboard']); // Redirección tras logueo exitoso
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set('Credenciales inválidas o error de conexión.');
        console.error('Login error:', err);
      }
    });
  }
}
