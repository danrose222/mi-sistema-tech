import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecordatorioInput {
  pedido_id?: number;
  telefono?: string;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private http = inject(HttpClient);
  private apiUrl = '/api/whatsapp';

  enviarRecordatorio(data: RecordatorioInput): Observable<{ success: boolean; result: any }> {
    return this.http.post<{ success: boolean; result: any }>(`${this.apiUrl}/recordatorio`, data);
  }
}
