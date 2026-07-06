import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card card">
        <div class="login-header">
          <h1 class="logo-mark" style="font-size: 1.8rem;">CEL<span class="dot">·</span>SHOP</h1>
          <p class="login-sub">Panel de administración</p>
        </div>

        @if (errorMsg) {
          <div class="error-msg">{{ errorMsg }}</div>
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="field">
            <label for="username">Usuario</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              [(ngModel)]="username" 
              required
              class="form-input"
              placeholder="admin"
              autofocus
            >
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="password" 
              required
              class="form-input"
              placeholder="••••••••"
            >
          </div>

          <button 
            type="submit" 
            class="btn-primary submit-btn"
            [disabled]="loginForm.invalid || isLoading"
          >
            {{ isLoading ? 'Ingresando...' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: 
        radial-gradient(ellipse at 50% 100%, rgba(59, 130, 246, 0.06) 0%, transparent 60%),
        var(--void);
      padding: 24px;
    }
    .login-card {
      padding: 48px 40px;
      width: 100%;
      max-width: 400px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 36px;
    }
    .login-sub {
      color: var(--ash);
      margin: 12px 0 0 0;
      font-size: 0.9rem;
      letter-spacing: 0.02em;
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 24px;
      font-size: 0.875rem;
      text-align: center;
    }
    .field {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: var(--ash);
      font-size: 0.85rem;
      font-weight: 500;
    }
    .submit-btn {
      width: 100%;
      margin-top: 8px;
      padding: 14px;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  username = '';
  password = '';
  errorMsg = '';
  isLoading = false;

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  onSubmit() {
    if (!this.username || !this.password) return;
    
    this.isLoading = true;
    this.errorMsg = '';

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = 'Credenciales inválidas o error de conexión.';
        console.error('Login error:', err);
      }
    });
  }
}
