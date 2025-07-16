import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Registro } from '../interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private baseUrl = `${environment.apiUrl}${environment.endpoints.historial}`;
  private http = inject(HttpClient);

  constructor() {}

  private getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token disponible. El usuario debe autenticarse.');
    }
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      })
    };
  }

  obtenerHistorial(): Observable<Registro[]> {
    return this.http.get<Registro[]>(this.baseUrl, this.getHeaders());
  }

  registrarPrestamo(data: Partial<Registro>): Observable<Registro> {
    return this.http.post<Registro>(`${this.baseUrl}/prestamo`, data, this.getHeaders());
  }

  registrarDevolucion(historialId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/devolucion/${historialId}`, {}, this.getHeaders());
  }

  materialesEnUso(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Ocupado`, this.getHeaders());
  }

  registrarPrestamoQR(data: {
    inventarioId: string;
    usuarioId: string;
    horaSolicitud: string;
    tipoPrestamo: 'qr' | 'reserva';
  }): Observable<Registro> {
    return this.http.post<Registro>(`${this.baseUrl}/prestamo`, {
      ...data,
      tipoPrestamo: 'qr' // Explicitly mark as QR loan
    }, this.getHeaders());
  }

  registrarDevolucionQR(historialId: string, data: { 
    horaDevolucion: string;
    estado?: string;
  }): Observable<Registro> {
    return this.http.put<Registro>(`${this.baseUrl}/devolucion/${historialId}`, {
      ...data,
      estado: 'Disponible' // Ensure status is set to available
    }, this.getHeaders());
  }

    obtenerPrestamosQRActivos(inventarioId: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.baseUrl}/qr-activos/${inventarioId}`, this.getHeaders());
  }

  // New method to check if equipment has active QR loan
  tienePrestamoQRActivo(inventarioId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/tiene-qr-activo/${inventarioId}`, this.getHeaders());
  }
}
