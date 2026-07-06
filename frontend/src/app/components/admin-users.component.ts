import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h2>Usuarios</h2>
      <form (ngSubmit)="create()">
        <input [(ngModel)]="form.username" name="username" placeholder="Usuario" required />
        <input [(ngModel)]="form.nombre" name="nombre" placeholder="Nombre" />
        <input [(ngModel)]="form.password" name="password" placeholder="Contraseña" type="password" required />
        <select [(ngModel)]="form.rol" name="rol">
          <option value="admin">admin</option>
          <option value="cajero">cajero</option>
          <option value="vendedor">vendedor</option>
        </select>
        <button type="submit">Crear usuario</button>
      </form>

      <h3>Listado</h3>
      <ul>
        <li *ngFor="let u of usuarios">
          {{u.username}} — {{u.nombre || '-' }} — {{u.rol}} <button (click)="remove(u.id)">Borrar</button>
        </li>
      </ul>
    </section>
  `
})
export class AdminUsersComponent {
  form: any = { username: '', nombre: '', password: '', rol: 'vendedor' };
  usuarios: any[] = [];

  async create() {
    const token = AuthService.getToken();
    try {
      await UserService.create(this.form, token);
      alert('Usuario creado');
      this.form = { username: '', nombre: '', password: '', rol: 'vendedor' };
      await this.load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creando usuario');
    }
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const token = AuthService.getToken();
    try {
      this.usuarios = await UserService.list(token);
    } catch (err) {
      console.error(err);
    }
  }

  async remove(id: number) {
    const token = AuthService.getToken();
    if (!confirm('Borrar usuario?')) return;
    try {
      await UserService.remove(id, token);
      await this.load();
    } catch (err) {
      alert('Error borrando usuario');
    }
  }
}
