import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h1>Registro</h1>
      <form (ngSubmit)="onSubmit()">
        <label>Usuario <input [(ngModel)]="username" name="username" required /></label>
        <label>Nombre <input [(ngModel)]="nombre" name="nombre" /></label>
        <label>Contraseña <input type="password" [(ngModel)]="password" name="password" required /></label>
        <button type="submit">Registrar</button>
      </form>
    </section>
  `
})
export class RegisterComponent {
  username = '';
  nombre = '';
  password = '';

  async onSubmit() {
    try {
      await AuthService.register({ username: this.username, password: this.password, nombre: this.nombre });
      alert('Usuario creado. Puedes iniciar sesión.');
      window.location.href = '/login';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error en registro');
    }
  }
}
