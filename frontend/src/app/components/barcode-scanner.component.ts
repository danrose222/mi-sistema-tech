import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-card">
      <h2>Escanear código de barras</h2>
      <video #videoElement width="100%" height="320" muted></video>
      <p *ngIf="barcode">Código detectado: {{ barcode }}</p>
      <div class="scanner-controls">
        <button type="button" (click)="startScanner()">Iniciar</button>
        <button type="button" (click)="stopScanner()">Detener</button>
      </div>
    </div>
  `,
  styles: [
    `
      .scanner-card { border: 1px solid #ccc; padding: 1rem; border-radius: 0.75rem; }
      video { display: block; width: 100%; max-height: 320px; background: #000; }
      .scanner-controls { margin-top: 1rem; display: flex; gap: 0.75rem; }
    `
  ]
})
export class BarcodeScannerComponent implements OnDestroy {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;
  @Output() barcodeDetected = new EventEmitter<string>();
  barcode = '';

  private codeReader = new BrowserMultiFormatReader();
  private currentStream?: MediaStream;

  async startScanner() {
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_39]);
      this.codeReader = new BrowserMultiFormatReader(hints);
      const videoInputDevices = await this.codeReader.listVideoInputDevices();
      const selectedDeviceId = videoInputDevices.length ? videoInputDevices[0].deviceId : undefined;

      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, facingMode: 'environment' }
      });
      this.videoElement.nativeElement.srcObject = this.currentStream;
      this.videoElement.nativeElement.play();

      this.codeReader.decodeFromVideoDevice(selectedDeviceId ?? null, this.videoElement.nativeElement, (result, err) => {
        if (result) {
          this.barcode = result.getText();
          this.barcodeDetected.emit(this.barcode);
          this.stopScanner();
        }
      });
    } catch (error) {
      console.error('Error iniciando el escáner de códigos:', error);
    }
  }

  stopScanner() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = undefined;
    }
    this.codeReader.reset();
  }

  ngOnDestroy() {
    this.stopScanner();
  }
}
