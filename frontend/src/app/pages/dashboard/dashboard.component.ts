import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h2>Dashboard</h2>
    <p>Bienvenido al panel de control principal.</p>
  `,
  styles: [`h2 { color: #0f172a; margin-top: 0; }`]
})
export class DashboardComponent {}
