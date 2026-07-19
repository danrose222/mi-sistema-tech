import { Component, ElementRef, QueryList, ViewChildren, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import JsBarcode from 'jsbarcode';

import { Producto } from '../../../services/productos.service';

const ANCHO_DEFECTO_MM = 50;
const ALTO_DEFECTO_MM = 25;

@Component({
  selector: 'app-etiqueta-producto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="etiqueta-toolbar pantalla-only">
      <h2 mat-dialog-title>Etiqueta de Producto</h2>

      <div class="config-impresion">
        <mat-form-field appearance="outline" class="config-input">
          <mat-label>Ancho (mm)</mat-label>
          <input matInput type="number" min="20" max="100" [(ngModel)]="anchoMm" (ngModelChange)="onConfigChange()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="config-input">
          <mat-label>Alto (mm)</mat-label>
          <input matInput type="number" min="15" max="100" [(ngModel)]="altoMm" (ngModelChange)="onConfigChange()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="config-input">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" min="1" max="200" [(ngModel)]="cantidad" (ngModelChange)="onConfigChange()">
        </mat-form-field>
      </div>

      <div class="toolbar-acciones">
        <button mat-stroked-button (click)="imprimir()">
          <mat-icon>print</mat-icon> Imprimir {{ cantidad > 1 ? (cantidad + ' etiquetas') : '' }}
        </button>
        <button mat-button mat-dialog-close>Cerrar</button>
      </div>
    </div>

    <mat-dialog-content>
      <div class="etiquetas-preview">
        @for (item of copiasArray(); track $index) {
          <div class="etiqueta" [style.width.mm]="anchoMm" [style.height.mm]="altoMm">
            <div class="etiqueta-nombre" [style.font-size.px]="7.5 * escalaAncho()">{{ data.producto.nombre }}</div>
            <svg #barcodeSvg class="etiqueta-barcode"></svg>
          </div>
        }
      </div>
    </mat-dialog-content>
  `,
  styles: [`
    .etiqueta-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 0 12px 12px 24px;
    }
    .config-impresion { display: flex; gap: 8px; }
    .config-input { width: 90px; }
    .config-input ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .toolbar-acciones { display: flex; align-items: center; gap: 8px; }

    mat-dialog-content {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .etiquetas-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      max-height: 65vh;
      overflow-y: auto;
    }

    /* Tamaño ajustable: por defecto 50mm x 25mm (etiqueta térmica estándar),
       pero se puede achicar/agrandar desde los inputs de Ancho/Alto. */
    .etiqueta {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1mm;
      padding: 2mm;
      box-sizing: border-box;
      border: 1px dashed #cbd5e1;
      flex-shrink: 0;
    }
    .etiqueta-nombre {
      font-weight: 700;
      text-align: center;
      color: #0f172a;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .etiqueta-barcode { width: 100%; max-height: 12mm; }

    @media print {
      :host { display: block; }
      .pantalla-only { display: none !important; }
      mat-dialog-content { padding: 0; }
      .etiquetas-preview { max-height: none; overflow: visible; gap: 0; }
      .etiqueta {
        border: none;
        margin: 0;
        /* Cada etiqueta ocupa una página entera del tamaño fijado en @page
           (ver actualizarPageSize()): con margin/gap en 0 y el alto exacto,
           el navegador pagina automáticamente una etiqueta por hoja/salto de
           la impresora térmica. La última no fuerza un salto extra en blanco. */
        break-after: page;
      }
      .etiqueta:last-child { break-after: auto; }
    }
  `]
})
export class EtiquetaProductoDialogComponent implements AfterViewInit, OnDestroy {
  dialogRef = inject(MatDialogRef<EtiquetaProductoDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { producto: Producto };

  @ViewChildren('barcodeSvg') barcodeSvgs!: QueryList<ElementRef<SVGSVGElement>>;

  anchoMm = ANCHO_DEFECTO_MM;
  altoMm = ALTO_DEFECTO_MM;
  cantidad = 1;

  private pageStyleEl?: HTMLStyleElement;

  // Reutiliza el mecanismo de impresión de comprobantes (ver styles.css:
  // body.imprimiendo-comprobante): aunque el nombre remite al comprobante de
  // venta, hace exactamente lo que necesita cualquier dialog CDK Overlay que
  // se imprima solo -> ocultar todo lo que quede fuera del overlay.
  private quitarClaseImpresion = () => document.body.classList.remove('imprimiendo-comprobante');

  constructor() {
    window.addEventListener('afterprint', this.quitarClaseImpresion);
  }

  ngOnDestroy() {
    window.removeEventListener('afterprint', this.quitarClaseImpresion);
    document.body.classList.remove('imprimiendo-comprobante');
    this.pageStyleEl?.remove();
  }

  ngAfterViewInit() {
    this.actualizarPageSize();
    this.renderizarBarcodes();
    this.barcodeSvgs.changes.subscribe(() => this.renderizarBarcodes());
  }

  copiasArray(): number[] {
    return Array.from({ length: Math.max(1, this.cantidad || 1) });
  }

  escalaAncho(): number {
    return this.anchoMm / ANCHO_DEFECTO_MM;
  }

  private escalaAlto(): number {
    return this.altoMm / ALTO_DEFECTO_MM;
  }

  onConfigChange() {
    this.actualizarPageSize();
    // El @for de cantidad cambia la cantidad de <svg> en el DOM: se
    // re-renderizan solos vía barcodeSvgs.changes. Si solo cambió el
    // tamaño (mismo largo de lista), no dispara "changes", así que se
    // fuerza el redibujado acá para que el barcode escale también.
    setTimeout(() => this.renderizarBarcodes(), 0);
  }

  // Fija el tamaño físico de página según lo configurado: @page no puede
  // bindearse desde Angular styles (son estáticos), así que se inyecta un
  // <style> propio que se actualiza en caliente cada vez que cambian
  // ancho/alto. Sin esto, la impresora intentaría usar A4 y la etiqueta
  // saldría chica en una esquina de una hoja grande.
  private actualizarPageSize() {
    if (!this.pageStyleEl) {
      this.pageStyleEl = document.createElement('style');
      document.head.appendChild(this.pageStyleEl);
    }
    this.pageStyleEl.textContent = `@page { size: ${this.anchoMm}mm ${this.altoMm}mm; margin: 0; }`;
  }

  private renderizarBarcodes() {
    const valor = this.data.producto.barcode || this.data.producto.sku || String(this.data.producto.id);
    const escalaAncho = this.escalaAncho();
    const escalaAlto = this.escalaAlto();

    this.barcodeSvgs.forEach((ref) => {
      JsBarcode(ref.nativeElement, valor, {
        format: 'CODE128',
        width: Math.max(0.5, 1.3 * escalaAncho),
        height: Math.max(10, 30 * escalaAlto),
        displayValue: true,
        fontSize: Math.max(6, 9 * escalaAlto),
        margin: 0
      });
    });
  }

  imprimir() {
    document.body.classList.add('imprimiendo-comprobante');
    window.print();
  }
}
