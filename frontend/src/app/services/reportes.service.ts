import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CajaDiaria {
  fecha: string;
  cantidadVentas: number;
  totalGeneral: number;
  efectivo: number;
  transferencia: number;
  tarjetaMp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/reportes';

  obtenerCajaDiaria(): Observable<{ success: boolean; data: CajaDiaria }> {
    return this.http.get<{ success: boolean; data: CajaDiaria }>(`${this.apiUrl}/caja-diaria`);
  }
}
