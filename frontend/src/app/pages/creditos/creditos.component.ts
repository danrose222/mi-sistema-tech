import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CreditosService, Credito } from '../../services/creditos.service';

@Component({
  selector: 'app-creditos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <h2 class="page-title">Gestión de Créditos</h2>
        <button mat-flat-button color="primary" (click)="nuevoCredito()">
          <mat-icon>add</mat-icon> Nuevo Crédito
        </button>
      </div>

      <div class="tabs-and-filters">
        <mat-tab-group (selectedTabChange)="onTabChange($event)" class="tabs-group">
          <mat-tab label="Todos"></mat-tab>
          <mat-tab label="Activos"></mat-tab>
          <mat-tab label="Morosos"></mat-tab>
          <mat-tab label="Liquidados"></mat-tab>
        </mat-tab-group>
      </div>

      <div class="table-container mat-elevation-z2">
        @if (isLoading()) {
          <div class="loading-shade">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
        }

        <table mat-table [dataSource]="creditos()">
          
          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef> Cliente </th>
            <td mat-cell *matCellDef="let element" class="fw-500"> {{element.cliente_nombre || 'Cliente #'+element.cliente_id}} </td>
          </ng-container>

          <ng-container matColumnDef="monto">
            <th mat-header-cell *matHeaderCellDef> Monto Total </th>
            <td mat-cell *matCellDef="let element"> {{element.monto_total | currency:'ARS':'symbol':'1.0-0'}} </td>
          </ng-container>

          <ng-container matColumnDef="cuotas">
            <th mat-header-cell *matHeaderCellDef> Cuotas </th>
            <td mat-cell *matCellDef="let element"> 
              {{element.cantidad_cuotas}} 
              <span class="muted">({{element.frecuencia}})</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let element"> 
              <span class="badge" [ngClass]="element.estado">
                {{element.estado | uppercase}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="actions-col"> Acciones </th>
            <td mat-cell *matCellDef="let element" class="actions-col">
              <button mat-icon-button color="primary" (click)="verDetalle(element.id)" matTooltip="Ver Cuotas">
                <mat-icon [matBadge]="element.estado === 'moroso' ? '!' : ''" matBadgeColor="warn" [matBadgeHidden]="element.estado !== 'moroso'">
                  visibility
                </mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-row"></tr>
          
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-state" colspan="5">
              <div class="empty-content">
                <mat-icon class="empty-icon">account_balance_wallet</mat-icon>
                <p>No se encontraron créditos con estos filtros.</p>
              </div>
            </td>
          </tr>
        </table>

        <mat-paginator 
          [length]="totalItems()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPageChange($event)"
          aria-label="Seleccionar página">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .page-title {
      margin: 0;
      color: #1e293b;
      font-weight: 600;
    }
    .tabs-and-filters {
      background: white;
      border-radius: 8px;
      padding: 0 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .table-container {
      position: relative;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    .loading-shade {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.6);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    table { width: 100%; }
    .fw-500 { font-weight: 500; }
    .muted { color: #64748b; font-size: 0.85em; }
    .actions-col { width: 100px; text-align: right; }
    .hover-row:hover { background-color: #f8fafc; cursor: pointer; }
    
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge.activo { background: #e0f2fe; color: #0284c7; }
    .badge.moroso { background: #fee2e2; color: #b91c1c; }
    .badge.liquidado { background: #dcfce3; color: #15803d; }
    .badge.cancelado { background: #f1f5f9; color: #475569; }

    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; }
    .empty-icon { font-size: 48px; height: 48px; width: 48px; color: #cbd5e1; }
  `]
})
export class CreditosComponent implements OnInit {
  private creditosService = inject(CreditosService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['cliente', 'monto', 'cuotas', 'estado', 'acciones'];
  
  creditos = signal<Credito[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  isLoading = signal<boolean>(false);
  
  filtroEstado = signal<string>('todos');

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading.set(true);
    
    this.creditosService.listar(this.pageIndex() + 1, this.pageSize(), this.filtroEstado()).subscribe({
      next: (res) => {
        this.creditos.set(res.data || []);
        this.totalItems.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al cargar créditos', 'Cerrar', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }

  onTabChange(event: any) {
    const estados = ['todos', 'activo', 'moroso', 'liquidado'];
    this.filtroEstado.set(estados[event.index]);
    this.pageIndex.set(0);
    this.cargarDatos();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarDatos();
  }

  nuevoCredito() {
    this.router.navigate(['/admin/creditos/nuevo']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/admin/creditos', id]);
  }
}
