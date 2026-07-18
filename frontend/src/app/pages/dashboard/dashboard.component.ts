import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, map, of } from 'rxjs';

import { DashboardService } from '../../services/dashboard.service';
import { ReportesService, CajaDiaria } from '../../services/reportes.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dashboard">
      <h2 class="page-title">Dashboard</h2>
      <p class="page-sub">Resumen general del negocio.</p>

      @if (isLoading()) {
        <div class="loading-shade">
          <mat-spinner diameter="44"></mat-spinner>
        </div>
      } @else if (resumen()) {
        <div class="kpi-grid">
          <a routerLink="/admin/clientes" class="kpi-card">
            <div class="kpi-icon signal"><mat-icon>group</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.totalClientes }}</span>
              <span class="kpi-label">Clientes registrados</span>
            </div>
          </a>

          <a routerLink="/admin/productos" class="kpi-card">
            <div class="kpi-icon signal"><mat-icon>inventory_2</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.totalProductos }}</span>
              <span class="kpi-label">Productos activos</span>
            </div>
          </a>

          <a routerLink="/admin/productos" class="kpi-card" [class.alert]="(resumen()?.productosStockBajo ?? 0) > 0">
            <div class="kpi-icon" [class.warn]="(resumen()?.productosStockBajo ?? 0) > 0"><mat-icon>warning</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.productosStockBajo }}</span>
              <span class="kpi-label">Con stock bajo (&le;5)</span>
            </div>
          </a>

          <a routerLink="/admin/pedidos" class="kpi-card">
            <div class="kpi-icon signal"><mat-icon>receipt_long</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.pedidosPendientes }}</span>
              <span class="kpi-label">Pedidos pendientes</span>
            </div>
          </a>

          <a routerLink="/admin/creditos" class="kpi-card">
            <div class="kpi-icon signal"><mat-icon>credit_score</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.creditosActivos }}</span>
              <span class="kpi-label">Créditos activos</span>
            </div>
          </a>

          <a routerLink="/admin/creditos" class="kpi-card" [class.alert]="(resumen()?.cuotasVencidas ?? 0) > 0">
            <div class="kpi-icon" [class.warn]="(resumen()?.cuotasVencidas ?? 0) > 0"><mat-icon>event_busy</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ resumen()?.cuotasVencidas }}</span>
              <span class="kpi-label">Cuotas vencidas</span>
            </div>
          </a>
        </div>

        <!-- Widget "Ventas del Mes": total destacado siempre visible + desglose colapsable -->
        @if (ventasMes(); as vm) {
          <div class="ventas-card">
            <div class="ventas-header">
              <div class="kpi-icon success"><mat-icon>payments</mat-icon></div>
              <div class="ventas-header-body">
                <span class="ventas-total">{{ vm.total_recaudado | currency:'ARS':'symbol':'1.0-0' }}</span>
                <span class="ventas-label">Ventas del mes · {{ vm.total_productos }} unidades vendidas</span>
              </div>
            </div>

            <button type="button" class="ventas-toggle" (click)="toggleDetalleVentas()">
              {{ mostrarDetalleVentas() ? 'Ocultar desglose' : 'Ver desglose de productos' }}
              <mat-icon class="chevron" [class.open]="mostrarDetalleVentas()">expand_more</mat-icon>
            </button>

            <div class="ventas-collapsible" [class.open]="mostrarDetalleVentas()">
              <div class="ventas-collapsible-inner">
                @if (vm.desglose.length > 0) {
                  <div class="ventas-desglose">
                    @for (item of vm.desglose; track item.producto_id) {
                      <div class="desglose-row">
                        <span class="desglose-nombre">{{ item.producto }}</span>
                        <span class="desglose-cantidad">x{{ item.cantidad_vendida }}</span>
                        <span class="desglose-monto">{{ item.subtotal | currency:'ARS':'symbol':'1.0-0' }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="ventas-empty">Todavía no se registraron ventas este mes.</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- Widget "Caja de Hoy": lo que ingresó por venta ya pagada en el día -->
        @if (cajaDiaria(); as caja) {
          <div class="caja-card">
            <div class="caja-header">
              <div class="kpi-icon success"><mat-icon>point_of_sale</mat-icon></div>
              <div class="caja-header-body">
                <span class="caja-total">{{ caja.totalGeneral | currency:'ARS':'symbol':'1.0-0' }}</span>
                <span class="caja-label">Caja de hoy · {{ caja.cantidadVentas }} venta(s)</span>
              </div>
            </div>

            @if (caja.totalGeneral > 0) {
              <div class="caja-bar">
                <div class="caja-bar-segment efectivo" [style.width.%]="pctEfectivo(caja)"></div>
                <div class="caja-bar-segment digital" [style.width.%]="pctDigital(caja)"></div>
              </div>
            }

            <div class="caja-desglose">
              <div class="caja-item">
                <mat-icon class="icono-efectivo">payments</mat-icon>
                <div class="caja-item-body">
                  <span class="caja-item-label">Efectivo</span>
                  <span class="caja-item-valor">{{ caja.efectivo | currency:'ARS':'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <div class="caja-item">
                <mat-icon class="icono-digital">credit_card</mat-icon>
                <div class="caja-item-body">
                  <span class="caja-item-label">Tarjeta / MercadoPago</span>
                  <span class="caja-item-valor">{{ caja.tarjetaMp | currency:'ARS':'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <div class="caja-item">
                <mat-icon class="icono-digital">account_balance</mat-icon>
                <div class="caja-item-body">
                  <span class="caja-item-label">Transferencia</span>
                  <span class="caja-item-valor">{{ caja.transferencia | currency:'ARS':'symbol':'1.0-0' }}</span>
                </div>
              </div>
              @if (caja.otrosIngresos > 0) {
                <div class="caja-item">
                  <mat-icon class="icono-otros">history</mat-icon>
                  <div class="caja-item-body">
                    <span class="caja-item-label">Deuda histórica cobrada</span>
                    <span class="caja-item-valor">{{ caja.otrosIngresos | currency:'ARS':'symbol':'1.0-0' }}</span>
                  </div>
                </div>
              }
            </div>

            <p class="caja-hint">
              <mat-icon>info</mat-icon>
              "Efectivo" es lo que debería haber físicamente en el cajón hoy; el resto ingresó por medios digitales.
            </p>
          </div>
        }
      } @else {
        <p class="error-msg">No se pudo cargar el resumen del dashboard.</p>
      }
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 4px; }
    .page-title {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--white);
    }
    .page-sub { margin: 0 0 24px 0; color: var(--ash); }

    .loading-shade { display: flex; justify-content: center; padding: 60px 0; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 20px;
      text-decoration: none;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .kpi-card:not(.no-link):hover {
      transform: translateY(-2px);
      border-color: var(--border-hover);
    }
    .kpi-card.alert { border-color: rgba(239, 68, 68, 0.4); }

    .kpi-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      background: rgba(0, 174, 239, 0.1);
      color: var(--signal);
      flex-shrink: 0;
    }
    .kpi-icon.success { background: rgba(34, 197, 94, 0.1); color: var(--success); }
    .kpi-icon.warn { background: rgba(239, 68, 68, 0.12); color: var(--danger); }

    .kpi-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--white);
      line-height: 1.1;
    }
    .kpi-label { font-size: 0.85rem; color: var(--ash); }

    /* Widget "Ventas del Mes" */
    .ventas-card {
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 24px;
      margin-top: 20px;
    }
    .ventas-header { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
    .ventas-header-body { display: flex; flex-direction: column; gap: 4px; }
    .ventas-total {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      color: var(--white);
      line-height: 1.1;
    }
    .ventas-label { font-size: 0.9rem; color: var(--ash); }

    .ventas-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--signal);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      padding: 10px 4px;
      margin: 0;
    }
    .ventas-toggle:hover { color: var(--white); }
    .ventas-toggle .chevron {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      transition: transform 0.25s ease;
    }
    .ventas-toggle .chevron.open { transform: rotate(180deg); }

    /* grid-template-rows 0fr -> 1fr da una transición de "alto" suave sin
       conocer el alto real del contenido (max-height fijo se ve entrecortado
       si el desglose es corto). */
    .ventas-collapsible {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.3s ease;
    }
    .ventas-collapsible.open { grid-template-rows: 1fr; }
    .ventas-collapsible-inner { overflow: hidden; }

    .ventas-desglose {
      display: flex;
      flex-direction: column;
      max-height: 260px;
      overflow-y: auto;
      border-top: 1px solid var(--border-dim);
      padding-top: 4px;
    }
    .desglose-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--border-dim);
    }
    .desglose-row:last-child { border-bottom: none; }
    .desglose-nombre {
      flex: 1;
      min-width: 0;
      color: var(--white);
      font-size: 0.92rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .desglose-cantidad {
      flex-shrink: 0;
      background: rgba(0, 174, 239, 0.12);
      color: var(--signal);
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .desglose-monto {
      flex-shrink: 0;
      min-width: 90px;
      text-align: right;
      color: var(--success);
      font-weight: 600;
      font-size: 0.92rem;
    }
    .ventas-empty { color: var(--ash); font-size: 0.9rem; margin: 0; }

    /* Widget "Caja de Hoy" */
    .caja-card {
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      padding: 24px;
      margin-top: 20px;
    }
    .caja-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .caja-header-body { display: flex; flex-direction: column; gap: 4px; }
    .caja-total {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      color: var(--white);
      line-height: 1.1;
    }
    .caja-label { font-size: 0.9rem; color: var(--ash); }

    .caja-bar {
      display: flex;
      height: 8px;
      border-radius: 100px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.06);
      margin-bottom: 20px;
    }
    .caja-bar-segment { height: 100%; transition: width 0.3s ease; }
    .caja-bar-segment.efectivo { background: var(--success); }
    .caja-bar-segment.digital { background: var(--signal); }

    .caja-desglose {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .caja-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
    }
    .caja-item mat-icon { flex-shrink: 0; font-size: 22px; width: 22px; height: 22px; }
    .caja-item .icono-efectivo { color: var(--success); }
    .caja-item .icono-digital { color: var(--signal); }
    .caja-item .icono-otros { color: var(--danger); }
    .caja-item-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .caja-item-label { font-size: 0.78rem; color: var(--ash); }
    .caja-item-valor { font-size: 1.1rem; font-weight: 700; color: var(--white); }

    .caja-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0;
      color: var(--ash);
      font-size: 0.8rem;
      line-height: 1.5;
    }
    .caja-hint mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }

    .error-msg { color: var(--danger); }
  `]
})
export class DashboardComponent {
  private dashboardService = inject(DashboardService);
  private reportesService = inject(ReportesService);

  // `toSignal` en vez de subscribe()+signal.set(): con withFetch(), la respuesta
  // HTTP puede resolver fuera de la zona de Angular en ciertos timings, así que
  // un signal.set() manual en el callback de subscribe() a veces no dispara la
  // detección de cambios (el valor queda actualizado en memoria pero el DOM no
  // se refresca). toSignal() se suscribe en un contexto de inyección y se
  // integra correctamente con la reactividad de Angular sin ese problema.
  private resumenResource = toSignal(
    this.dashboardService.obtenerResumen().pipe(
      map(res => res.data),
      catchError(err => {
        console.error(err);
        return of(null);
      })
    )
  );
  resumen = computed(() => this.resumenResource() ?? null);
  isLoading = computed(() => this.resumenResource() === undefined);

  ventasMes = toSignal(
    this.dashboardService.obtenerVentasMes().pipe(
      map(res => res.data),
      catchError(err => {
        console.error('Error al cargar el desglose de ventas del mes:', err);
        return of(null);
      })
    )
  );

  mostrarDetalleVentas = signal(false);

  toggleDetalleVentas() {
    this.mostrarDetalleVentas.update(v => !v);
  }

  cajaDiaria = toSignal(
    this.reportesService.obtenerCajaDiaria().pipe(
      map(res => res.data),
      catchError(err => {
        console.error('Error al cargar la caja diaria:', err);
        return of(null);
      })
    )
  );

  pctEfectivo(caja: CajaDiaria): number {
    if (!caja.totalGeneral) return 0;
    return (caja.efectivo / caja.totalGeneral) * 100;
  }

  pctDigital(caja: CajaDiaria): number {
    return 100 - this.pctEfectivo(caja);
  }
}
