


import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Registro } from '../interface';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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

  verificarDisponibilidad(inventarioId: string, horaInicio: number, horaFin: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/verificar-disponibilidad`, {
      inventarioId,
      horaInicio,
      horaFin
    }, this.getHeaders());
  }

  obtenerHistorial(): Observable<Registro[]> {
    return this.http.get<Registro[]>(this.baseUrl, this.getHeaders());
  }

  registrarPrestamo(data: Partial<Registro>): Observable<Registro> {
    return this.http.post<Registro>(`${this.baseUrl}/prestamo`, data, this.getHeaders());
  }

  
  registrarDevolucion(
  historialId: string, 
  data: { horaDevolucion: string; estado?: string } = { 
    horaDevolucion: new Date().toTimeString().slice(0, 5),
    estado: 'Disponible'
  }
): Observable<Registro> {
  return this.http.put<Registro>(
    `${this.baseUrl}/devolucion/${historialId}`, 
    data, 
    this.getHeaders()
  );
}


  materialesEnUso(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Ocupado`, this.getHeaders());
  }

  registrarPrestamoQR(data: {
    inventarioId: string;
    usuarioId: string;
    horaSolicitud: string;
    tipoPrestamo: 'qr' | 'reserva';
    horaInicioNumero?: number;
  }): Observable<Registro> {
    return this.http.post<Registro>(`${this.baseUrl}/prestamo`, {
      ...data,
      tipoPrestamo: 'qr'
    }, this.getHeaders());
  }

  registrarDevolucionQR(historialId: string, data: { 
    horaDevolucion: string;
    estado?: string;
  }): Observable<Registro> {
    return this.http.put<Registro>(`${this.baseUrl}/devolucion/${historialId}`, {
      ...data,
      estado: 'Disponible'
    }, this.getHeaders());
  }



  obtenerPrestamosActivosPorUsuario(usuarioId: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.baseUrl}/usuario/${usuarioId}/activos`, this.getHeaders()).pipe(
      catchError(() => of([]))
    );
  }

  obtenerPrestamosPorEquipo(inventarioId: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.baseUrl}/equipo/${inventarioId}`, this.getHeaders()).pipe(
      catchError(() => of([]))
    );
  }

tienePrestamoActivo(inventarioId: string, usuarioId: string): Observable<boolean> {
  return this.materialesEnUso().pipe(
    map(prestamos => {
      const prestamosActivos = prestamos.filter(p => {
        // Asegurarse que existe inventarioId y usuarioId y que son strings
        const idEquipo = typeof p.inventarioId === 'string'
          ? p.inventarioId
          : p.inventarioId?._id || '';

        const idUsuario = typeof p.usuarioId === 'string'
          ? p.usuarioId
          : p.usuarioId?._id || '';

        // El préstamo está activo si no tiene horaDevolucion definida o vacía
        const noDevuelto = !p.horaDevolucion || p.horaDevolucion === '' || p.horaDevolucion === null;

        return idEquipo === inventarioId && idUsuario === usuarioId && noDevuelto;
      });
      return prestamosActivos.length > 0;
    }),
    catchError(() => of(false))
  );
}

tienePrestamoQRActivo(inventarioId: string, usuarioId: string): Observable<boolean> {
  return this.materialesEnUso().pipe(
    map(prestamos => {
      return prestamos.some(p => {
        const idEquipo = typeof p.inventarioId === 'string' 
          ? p.inventarioId 
          : p.inventarioId?._id;
        const idUsuario = typeof p.usuarioId === 'string' 
          ? p.usuarioId 
          : p.usuarioId?._id;
        
        return idEquipo === inventarioId && 
               idUsuario === usuarioId && 
               p.tipoPrestamo === 'qr' &&
               !p.horaDevolucion;
      });
    }),
    catchError(() => of(false))
  );
}


obtenerPrestamosQRActivosUsuario(inventarioId: string, usuarioId: string): Observable<Registro[]> {
  return this.materialesEnUso().pipe(
    map(prestamos => {
      return prestamos.filter(p => {
        const idEquipo = typeof p.inventarioId === 'string' 
          ? p.inventarioId 
          : p.inventarioId?._id;
        const idUsuario = typeof p.usuarioId === 'string' 
          ? p.usuarioId 
          : p.usuarioId?._id;
        
        return idEquipo === inventarioId && 
               idUsuario === usuarioId && 
               p.tipoPrestamo === 'qr' &&
               !p.horaDevolucion;
      });
    }),
    catchError(() => of([]))
  );
}

  obtenerPrestamosQRActivos(inventarioId: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.baseUrl}/qr-activos/${inventarioId}`, this.getHeaders());
  }

}