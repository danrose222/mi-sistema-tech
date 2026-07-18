import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import JsBarcode from 'jsbarcode';

import { Producto } from '../../../services/productos.service';

@Component({
  selector: 'app-etiqueta-producto-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="etiqueta-toolbar pantalla-only">
      <h2 mat-dialog-title>Etiqueta de Producto</h2>
      <div class="toolbar-acciones">
        <button mat-stroked-button (click)="imprimir()">
          <mat-icon>print</mat-icon> Imprimir
        </button>
        <button mat-button mat-dialog-close>Cerrar</button>
      </div>
    </div>

    <mat-dialog-content>
      <div class="etiqueta">
        <div class="etiqueta-nombre">{{ data.producto.nombre }}</div>
        <svg #barcodeSvg class="etiqueta-barcode"></svg>
        <div class="etiqueta-precio">{{ data.producto.precio | currency:'ARS' }}</div>
      </div>
    </mat-dialog-content>
  `,
  styles: [`
    .etiqueta-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 12px 0 24px;
    }
    .toolbar-acciones { display: flex; gap: 8px; }

    mat-dialog-content {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    /* 50mm x 25mm: tamaño estándar de etiqueta adhesiva para impresora de rótulos */
    .etiqueta {
      width: 50mm;
      height: 25mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1mm;
      padding: 2mm;
      box-sizing: border-box;
      border: 1px dashed #cbd5e1;
    }
    .etiqueta-nombre {
      font-size: 7.5px;
      font-weight: 700;
      text-align: center;
      color: #0f172a;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .etiqueta-barcode { width: 100%; max-height: 12mm; }
    .etiqueta-precio {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Sin esto, Chrome/Edge en Windows reservan su propio margen de página
       (~1.27cm) para el encabezado/pie con URL y fecha que agregan por
       default: en una impresora térmica de 50x25mm ese margen por sí solo ya
       excede el largo de la etiqueta y la corta o la manda a una segunda
       hoja en blanco. size fija el ancho/alto exacto de la etiqueta. */
    @page {
      size: 50mm 25mm;
      margin: 0;
    }

    @media print {
      :host { display: block; }
      .pantalla-only { display: none !important; }
      mat-dialog-content { padding: 0; }
      .etiqueta {
        border: none;
        margin: 0;
      }
    }
  `]
})
export class EtiquetaProductoDialogComponent implements AfterViewInit, OnDestroy {
  dialogRef = inject(MatDialogRef<EtiquetaProductoDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { producto: Producto };

  @ViewChild('barcodeSvg') barcodeSvgRef!: ElementRef<SVGSVGElement>;

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
  }

  ngAfterViewInit() {
    const valor = this.data.producto.barcode || this.data.producto.sku || String(this.data.producto.id);
    JsBarcode(this.barcodeSvgRef.nativeElement, valor, {
      format: 'CODE128',
      width: 1.3,
      height: 30,
      displayValue: true,
      fontSize: 9,
      margin: 0
    });

    // La consigna pide imprimir automáticamente apenas se renderiza la
    // etiqueta; el setTimeout deja que Angular termine de pintar el SVG
    // antes de disparar el motor de impresión (mismo patrón que el
    // comprobante de venta con autoprint).
    setTimeout(() => this.imprimir(), 0);
  }

  imprimir() {
    document.body.classList.add('imprimiendo-comprobante');
    window.print();
  }
}
