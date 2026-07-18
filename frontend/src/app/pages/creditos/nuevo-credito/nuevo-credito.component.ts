import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { CreditosService } from '../../../services/creditos.service';
import { ClientesService, Cliente } from '../../../services/clientes.service';
import { ProductosService, Producto } from '../../../services/productos.service';

@Component({
  selector: 'app-nuevo-credito',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div class="page-container">
      <div class="header-container">
        <button mat-icon-button (click)="cancelar()" aria-label="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="page-title">Otorgar Nuevo Crédito</h2>
      </div>

      <mat-card class="stepper-card mat-elevation-z2">
        <mat-card-content>
          <mat-stepper [linear]="true" #stepper>
            
            <!-- Paso 1: Cliente -->
            <mat-step [stepControl]="clienteFormGroup">
              <form [formGroup]="clienteFormGroup">
                <ng-template matStepLabel>Seleccionar Cliente</ng-template>
                <div class="step-content">
                  <p class="step-desc">Busque y seleccione el cliente al cual se le otorgará el crédito.</p>

                  <div class="dni-busqueda-row">
                    <mat-form-field appearance="outline" class="dni-field">
                      <mat-label>Buscar por DNI</mat-label>
                      <input matInput #dniInput type="text" inputmode="numeric" maxlength="8" placeholder="Ej. 30111222" (keyup.enter)="buscarPorDni(dniInput.value)">
                      <button matSuffix mat-icon-button [disabled]="buscandoPorDni()" (click)="buscarPorDni(dniInput.value)" aria-label="Buscar por DNI">
                        <mat-icon>badge</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>
                  @if (errorBusquedaDni(); as msg) {
                    <p class="dni-error">{{ msg }}</p>
                  }

                  <div class="separador-o"><span>o buscá por nombre / email</span></div>

                  <mat-form-field appearance="outline" class="full-width search-field">
                    <mat-label>Buscar cliente...</mat-label>
                    <input matInput type="text" formControlName="clienteSearch" [matAutocomplete]="auto" placeholder="Nombre o email...">
                    <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayCliente">
                      @for (cliente of clientesFiltrados(); track cliente.id) {
                        <mat-option [value]="cliente">
                          {{ cliente.nombre }} <span class="muted-text">({{ cliente.email || 'Sin email' }})</span>
                        </mat-option>
                      }
                    </mat-autocomplete>
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>

                  @if (clienteSeleccionado(); as c) {
                    <div class="cliente-seleccionado-card">
                      <mat-icon>check_circle</mat-icon>
                      <div>
                        <strong>{{ c.nombre }}</strong>
                        <span>{{ c.telefono || 'Sin teléfono' }}</span>
                      </div>
                    </div>
                  }
                </div>
                
                <div class="step-actions">
                  <button mat-flat-button color="primary" matStepperNext [disabled]="!isClienteSeleccionado()">Continuar</button>
                </div>
              </form>
            </mat-step>

            <!-- Paso 2: Producto -->
            <mat-step [stepControl]="productoFormGroup">
              <form [formGroup]="productoFormGroup">
                <ng-template matStepLabel>Seleccionar Producto</ng-template>
                <div class="step-content">
                  <p class="step-desc">Busque y seleccione el producto que se está financiando.</p>

                  <mat-form-field appearance="outline" class="full-width search-field">
                    <mat-label>Buscar producto...</mat-label>
                    <input matInput type="text" formControlName="productoSearch" [matAutocomplete]="autoProducto" placeholder="Nombre o SKU...">
                    <mat-autocomplete #autoProducto="matAutocomplete" [displayWith]="displayProducto">
                      @for (producto of productosFiltrados(); track producto.id) {
                        <mat-option [value]="producto">
                          {{ producto.nombre }} <span class="muted-text">({{ producto.precio | currency:'ARS':'symbol':'1.0-0' }} · stock: {{ producto.stock }})</span>
                        </mat-option>
                      }
                    </mat-autocomplete>
                    <mat-icon matSuffix>inventory_2</mat-icon>
                  </mat-form-field>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Atrás</button>
                  <button mat-flat-button color="primary" matStepperNext [disabled]="!isProductoSeleccionado()">Continuar</button>
                </div>
              </form>
            </mat-step>

            <!-- Paso 3: Configurar Pago -->
            <mat-step [stepControl]="creditoFormGroup">
              <form [formGroup]="creditoFormGroup">
                <ng-template matStepLabel>Configurar Pago</ng-template>
                <div class="step-content form-grid">
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Monto Total (ARS)</mat-label>
                    <span matTextPrefix>$&nbsp;</span>
                    <input matInput type="number" formControlName="montoTotal" min="1" required>
                    <mat-error>El monto es requerido y debe ser mayor a 0</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Frecuencia de Pago</mat-label>
                    <mat-select formControlName="frecuencia" required>
                      <mat-option value="semanal">Semanal</mat-option>
                      <mat-option value="mensual">Mensual</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Cantidad de Cuotas</mat-label>
                    <input matInput type="number" formControlName="cantidadCuotas" min="2" max="48" required>
                    <mat-error>Mínimo 2 y máximo 48 cuotas</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Fecha de 1° Cuota</mat-label>
                    <input matInput [matDatepicker]="picker" formControlName="fechaPrimeraCuota" required>
                    <mat-hint>DD/MM/AAAA</mat-hint>
                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="full-grid">
                    <mat-label>Notas adicionales (opcional)</mat-label>
                    <textarea matInput formControlName="notas" rows="2" placeholder="Ej. Garantía retenida..."></textarea>
                  </mat-form-field>
                </div>
                
                <!-- Info Calculada Real-time -->
                @if (montoCuotaCalculado() > 0) {
                  <div class="calc-banner">
                    <mat-icon color="primary">info</mat-icon>
                    <span>El cliente abonará <strong>{{ creditoFormGroup.get('cantidadCuotas')?.value }}</strong> cuotas de aproximadamente <strong>{{ montoCuotaCalculado() | currency:'ARS' }}</strong> {{ creditoFormGroup.get('frecuencia')?.value }}.</span>
                  </div>
                }

                <div class="step-actions mt-3">
                  <button mat-button matStepperPrevious>Atrás</button>
                  <button mat-flat-button color="primary" matStepperNext [disabled]="creditoFormGroup.invalid">Siguiente</button>
                </div>
              </form>
            </mat-step>

            <!-- Paso 4: Confirmación -->
            <mat-step>
              <ng-template matStepLabel>Confirmación</ng-template>
              <div class="step-content">
                <h3 class="summary-title">Resumen Final del Crédito</h3>
                <div class="summary-box">
                  <div class="summary-row"><span>Cliente:</span> <strong>{{ clienteSeleccionado()?.nombre }}</strong></div>
                  <div class="summary-row"><span>Producto financiado:</span> <strong>{{ productoSeleccionado()?.nombre }}</strong></div>
                  <div class="summary-row"><span>Monto Total a financiar:</span> <strong>{{ creditoFormGroup.get('montoTotal')?.value | currency:'ARS' }}</strong></div>
                  <div class="summary-row"><span>Plan de pagos:</span> <strong>{{ creditoFormGroup.get('cantidadCuotas')?.value }} cuotas ({{ creditoFormGroup.get('frecuencia')?.value }})</strong></div>
                  <div class="summary-row highlight"><span>Valor aprox. por Cuota:</span> <strong>{{ montoCuotaCalculado() | currency:'ARS' }}</strong></div>
                  <div class="summary-row"><span>Primer vencimiento:</span> <strong>{{ creditoFormGroup.get('fechaPrimeraCuota')?.value | date:'mediumDate' }}</strong></div>
                </div>
                <p class="summary-warning"><mat-icon>warning</mat-icon> Al confirmar, se generará el crédito y las cuotas automáticamente, y se registrará un movimiento de salida en la cuenta corriente del cliente.</p>
              </div>
              
              <div class="step-actions mt-4">
                <button mat-button matStepperPrevious [disabled]="isSubmitting()">Atrás</button>
                <button mat-flat-button color="primary" (click)="confirmarCredito()" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'Generando Crédito...' : 'Confirmar y Crear Crédito' }}
                </button>
              </div>
            </mat-step>

          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .page-title { margin: 0; color: #1e293b; font-weight: 600; font-size: 1.5rem; }
    
    .stepper-card {
      border-radius: 12px;
      padding: 8px 0;
    }

    .step-content {
      padding: 24px 8px;
    }
    .step-desc {
      color: #64748b;
      margin-bottom: 24px;
      font-size: 1.05rem;
    }

    .full-width { width: 100%; }
    .search-field { max-width: 500px; }
    .muted-text { color: #94a3b8; font-size: 0.9em; }

    .dni-busqueda-row { max-width: 320px; }
    .dni-field { width: 100%; }
    .dni-error {
      margin: -8px 0 16px;
      color: #b91c1c;
      font-size: 0.85rem;
    }
    .separador-o {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 4px 0 20px;
      color: #94a3b8;
      font-size: 0.8rem;
    }
    .separador-o::before, .separador-o::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .cliente-seleccionado-card {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      color: #15803d;
      max-width: 500px;
    }
    .cliente-seleccionado-card mat-icon { flex-shrink: 0; }
    .cliente-seleccionado-card div { display: flex; flex-direction: column; gap: 2px; }
    .cliente-seleccionado-card strong { color: #14532d; }
    .cliente-seleccionado-card span { font-size: 0.85rem; color: #16a34a; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-grid { grid-column: 1 / -1; }
    
    .step-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .mt-3 { margin-top: 16px; }
    .mt-4 { margin-top: 32px; }

    .calc-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f0f9ff;
      padding: 16px 20px;
      border-radius: 8px;
      color: #0369a1;
      margin-top: 8px;
      margin-bottom: 24px;
      border: 1px solid #bae6fd;
    }

    /* Summary */
    .summary-title {
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 1.05rem;
      color: #475569;
    }
    .summary-row strong { color: #0f172a; }
    .summary-row.highlight {
      background: #f1f5f9;
      padding: 16px;
      border-radius: 6px;
      margin: 8px -12px;
      color: #0284c7;
      border: 1px dashed #bae6fd;
    }
    .summary-row.highlight strong { color: #0369a1; font-size: 1.25rem; }
    
    .summary-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d97706;
      background: #fffbeb;
      padding: 12px;
      border-radius: 8px;
      margin-top: 24px;
      font-size: 0.9rem;
    }
    .summary-warning mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class NuevoCreditoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private creditosService = inject(CreditosService);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isSubmitting = signal(false);
  clientesFiltrados = signal<Cliente[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  buscandoPorDni = signal(false);
  errorBusquedaDni = signal<string | null>(null);

  // Forms
  clienteFormGroup = this.fb.group({
    clienteSearch: ['', Validators.required]
  });

  productoFormGroup = this.fb.group({
    productoSearch: ['', Validators.required]
  });

  creditoFormGroup = this.fb.group({
    montoTotal: ['', [Validators.required, Validators.min(1)]],
    cantidadCuotas: [3, [Validators.required, Validators.min(2), Validators.max(48)]],
    frecuencia: ['mensual', Validators.required],
    fechaPrimeraCuota: [new Date(), Validators.required],
    notas: ['']
  });

  // `computed()` solo reacciona a lecturas de Signals: leer `FormGroup.get().value`
  // directamente adentro de un `computed` lo deja "congelado" en su valor inicial
  // para siempre (nunca se vuelve a evaluar), que era la causa real de que el
  // stepper quedara trabado aunque el cliente sí se seleccionara. Convertimos
  // los `valueChanges` a Signal con `toSignal` para que sí sean reactivos.
  private clienteSearchValue = toSignal(this.clienteFormGroup.get('clienteSearch')!.valueChanges, {
    initialValue: this.clienteFormGroup.get('clienteSearch')!.value
  });
  private productoSearchValue = toSignal(this.productoFormGroup.get('productoSearch')!.valueChanges, {
    initialValue: this.productoFormGroup.get('productoSearch')!.value
  });
  private creditoFormValue = toSignal(this.creditoFormGroup.valueChanges, {
    initialValue: this.creditoFormGroup.getRawValue()
  });

  clienteSeleccionado = computed(() => {
    const val = this.clienteSearchValue();
    return typeof val === 'object' && val !== null ? (val as Cliente) : null;
  });

  isClienteSeleccionado = computed(() => this.clienteSeleccionado() !== null);

  productoSeleccionado = computed(() => {
    const val = this.productoSearchValue();
    return typeof val === 'object' && val !== null ? (val as Producto) : null;
  });

  isProductoSeleccionado = computed(() => this.productoSeleccionado() !== null);

  montoCuotaCalculado = computed(() => {
    const v = this.creditoFormValue();
    const total = Number(v.montoTotal);
    const cuotas = Number(v.cantidadCuotas);
    if (total && cuotas && cuotas > 0) {
      return total / cuotas;
    }
    return 0;
  });

  constructor() {
    // Al elegir un producto, autocompletamos el Monto Total con su precio
    // (el campo queda editable por si el monto final difiere, ej. con seña).
    effect(() => {
      const producto = this.productoSeleccionado();
      if (producto) {
        this.creditoFormGroup.get('montoTotal')?.setValue(String(producto.precio));
      }
    });
  }

  ngOnInit() {
    // Autocomplete con debounce buscando clientes
    this.clienteFormGroup.get('clienteSearch')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const searchStr = typeof value === 'string' ? value : (value as any)?.nombre || '';
        if (!searchStr) return of({ data: [] });
        return this.clientesService.listar(1, 10, searchStr);
      })
    ).subscribe({
      next: (res) => {
        this.clientesFiltrados.set(res.data || []);
      }
    });

    // Autocomplete con debounce buscando productos
    this.productoFormGroup.get('productoSearch')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const searchStr = typeof value === 'string' ? value : (value as any)?.nombre || '';
        if (!searchStr) return of({ data: [] });
        return this.productosService.listar(1, 10, searchStr);
      })
    ).subscribe({
      next: (res) => {
        this.productosFiltrados.set(res.data || []);
      }
    });
  }

  displayCliente(cliente: Cliente): string {
    return cliente && cliente.nombre ? cliente.nombre : '';
  }

  buscarPorDni(dniRaw: string) {
    const dni = dniRaw.trim();
    if (!dni || this.buscandoPorDni()) return;

    this.buscandoPorDni.set(true);
    this.errorBusquedaDni.set(null);

    this.clientesService.buscarPorDni(dni).subscribe({
      next: (res) => {
        this.buscandoPorDni.set(false);
        // Mismo mecanismo que seleccionar una opción del autocomplete (que
        // vía ControlValueAccessor tampoco pasa por chequeo de tipos acá):
        // el computed `clienteSeleccionado` reacciona a este valor solo.
        this.clienteFormGroup.get('clienteSearch')?.setValue(res.data as any);
      },
      error: (err) => {
        this.buscandoPorDni.set(false);
        this.errorBusquedaDni.set(
          err?.status === 404 ? 'No se encontró ningún cliente con ese DNI' : 'Error al buscar el cliente'
        );
      }
    });
  }

  displayProducto(producto: Producto): string {
    return producto && producto.nombre ? producto.nombre : '';
  }

  confirmarCredito() {
    if (this.clienteFormGroup.invalid || this.productoFormGroup.invalid || this.creditoFormGroup.invalid
        || !this.clienteSeleccionado() || !this.productoSeleccionado()) {
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      clienteId: this.clienteSeleccionado()!.id,
      productoId: this.productoSeleccionado()!.id,
      montoTotal: this.creditoFormGroup.value.montoTotal,
      cantidadCuotas: this.creditoFormGroup.value.cantidadCuotas,
      frecuencia: this.creditoFormGroup.value.frecuencia,
      fechaPrimeraCuota: this.formatDate(this.creditoFormGroup.value.fechaPrimeraCuota as Date),
      notas: this.creditoFormGroup.value.notas
    };

    this.creditosService.crear(payload).subscribe({
      next: (res) => {
        this.snackBar.open('Crédito generado exitosamente', 'Ver Cuotas', { duration: 6000 })
          .onAction().subscribe(() => {
            this.router.navigate(['/admin/creditos', res.data.id]);
          });
          
        setTimeout(() => {
          if (this.router.url.includes('nuevo')) {
            this.router.navigate(['/admin/creditos']);
          }
        }, 2000);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(err.error?.error || 'Error al crear el crédito', 'Cerrar', { duration: 5000 });
        this.isSubmitting.set(false);
      }
    });
  }

  // Formato YYYY-MM-DD necesario para el backend
  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  cancelar() {
    this.router.navigate(['/admin/creditos']);
  }
}
