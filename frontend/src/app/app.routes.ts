import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';

export const routes: Routes = [
  // Rutas Públicas (E-commerce)
  {
    path: '',
    loadComponent: () => import('./components/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/public/home/home.component').then(m => m.HomeComponent) },
      { path: 'productos', loadComponent: () => import('./pages/public/productos-list/productos-list.component').then(m => m.ProductosListComponent) },
      { path: 'producto/:slug', loadComponent: () => import('./pages/public/producto-detalle/producto-detalle.component').then(m => m.ProductoDetalleComponent) },
      { path: 'carrito', loadComponent: () => import('./pages/public/carrito/carrito.component').then(m => m.CarritoComponent) },
      { path: 'checkout', loadComponent: () => import('./pages/public/checkout/checkout.component').then(m => m.CheckoutComponent) },

      // Páginas legales: comparten un único componente genérico, `data.slug`
      // selecciona el contenido correspondiente en legal-content.ts.
      { path: 'legal/terminos-y-condiciones', loadComponent: () => import('./pages/public/legal/legal.component').then(m => m.LegalComponent), data: { slug: 'terminos' } },
      { path: 'legal/privacidad', loadComponent: () => import('./pages/public/legal/legal.component').then(m => m.LegalComponent), data: { slug: 'privacidad' } },
      { path: 'legal/cookies', loadComponent: () => import('./pages/public/legal/legal.component').then(m => m.LegalComponent), data: { slug: 'cookies' } },
      { path: 'legal/arrepentimiento', loadComponent: () => import('./pages/public/legal/legal.component').then(m => m.LegalComponent), data: { slug: 'arrepentimiento' } }
    ]
  },
  
  // Rutas Administrativas
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    component: LayoutComponent, // Keep Layout Component eager loaded for now to avoid flickering, or lazy load if requested. The components inside are lazy loaded.
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes.component').then(m => m.ClientesComponent) },
      { path: 'productos', loadComponent: () => import('./pages/productos/productos.component').then(m => m.ProductosComponent) },
      { path: 'pedidos', loadComponent: () => import('./pages/pedidos/pedidos.component').then(m => m.PedidosComponent) },
      { path: 'stock', loadComponent: () => import('./pages/stock/stock.component').then(m => m.StockComponent) },
      { path: 'presupuestos', loadComponent: () => import('./pages/presupuesto/presupuesto.component').then(m => m.PresupuestoComponent) },
      { path: 'caja', loadComponent: () => import('./pages/pos/pos.component').then(m => m.PosComponent) },

      // Rutas de Créditos
      { path: 'creditos', loadComponent: () => import('./pages/creditos/creditos.component').then(m => m.CreditosComponent) },
      { path: 'creditos/nuevo', loadComponent: () => import('./pages/creditos/nuevo-credito/nuevo-credito.component').then(m => m.NuevoCreditoComponent) },
      { path: 'creditos/:id', loadComponent: () => import('./pages/creditos/credito-detalle/credito-detalle.component').then(m => m.CreditoDetalleComponent) }
    ]
  },
  {
    // Catch all 
    path: '**',
    redirectTo: ''
  }
];
