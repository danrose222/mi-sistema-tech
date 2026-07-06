import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="login-page">
      <div class="card login-card">
        <h1>Iniciar sesión</h1>
        <form (ngSubmit)="onSubmit()">
          <label>
            Usuario
            <input class="form-input" [(ngModel)]="username" name="username" required />
          </label>
          <label>
            Contraseña
            <input class="form-input" type="password" [(ngModel)]="password" name="password" required />
          </label>
          <button class="btn-primary" type="submit">Entrar</button>
        </form>
      </div>
    </section>
  `
})
export class LoginComponent {
  username = '';
  password = '';

  async onSubmit() {
    try {
      await AuthService.login(this.username, this.password);
      window.location.href = '/stock';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error en login');
    }
  }
}
