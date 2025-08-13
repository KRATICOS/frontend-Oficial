


import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Registro } from '../interface';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { forkJoin } from 'rxjs';



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



// En tu HistorialService (historial.service.ts)

// Método para obtener todos los préstamos sin filtrar (usando materialesEnUso y obtenerHistorial)
obtenerTodosLosPrestamos(): Observable<Registro[]> {
  return forkJoin([
    this.materialesEnUso(),       // Préstamos activos
    this.obtenerHistorial()       // Todo el historial
  ]).pipe(
    map(([activos, historial]) => {
      // Combinar y eliminar duplicados
      const todos = [...activos, ...historial];
      const idsUnicos = new Set();
      
      return todos.filter(prestamo => {
        const id = prestamo._id;
        if (!idsUnicos.has(id)) {
          idsUnicos.add(id);
          return true;
        }
        return false;
      });
    }),
    catchError(() => of([]))
  );
}

// Método para obtener préstamos por usuario (filtrado en frontend)
obtenerPrestamosPorUsuario(usuarioId: string): Observable<Registro[]> {
  return this.obtenerTodosLosPrestamos().pipe(
    map(prestamos => {
      return prestamos.filter(p => {
        // Manejar tanto si usuarioId es string como si es objeto
        const idUsuario = typeof p.usuarioId === 'string' 
          ? p.usuarioId 
          : p.usuarioId?._id;
        return idUsuario === usuarioId;
      });
    }),
    catchError(() => of([]))
  );
}

// Método mejorado para obtenerHistorial que incluya todos los datos necesarios
obtenerHistorialCompleto(): Observable<Registro[]> {
  return this.obtenerHistorial().pipe(
    map(registros => {
      return registros.map(registro => ({
        ...registro,
        // Asegurar que tipoPrestamo existe (para registros antiguos)
        tipoPrestamo: registro.tipoPrestamo || 'reserva'
      }));
    })
  );
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


  materialesEnUso(): Observable<Registro[]> {
  return this.http.get<Registro[]>(`${this.baseUrl}/Ocupado`, this.getHeaders()).pipe(
    map(registros => {
      // Filtrar solo registros activos sin devolución y con estado Ocupado
      return registros.filter(registro => 
        !registro.horaDevolucion && 
        registro.estado === 'Ocupado'
      );
    }),
    catchError(() => of([]))
  );
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


obtenerPrestamosActivosPorUsuario(inventarioId: string, usuarioId: string): Observable<Registro[]> {
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
               p.tipoPrestamo === 'reserva' &&
               !p.horaDevolucion;
      });
    }),
    catchError(() => of([]))
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

tienePrestamoQRActivoParaUsuario(usuarioId: string): Observable<boolean> {
  return this.materialesEnUso().pipe(
    map(prestamos => {
      return prestamos.some(p => {
        const idUsuario = typeof p.usuarioId === 'string' 
          ? p.usuarioId 
          : p.usuarioId?._id;

        return idUsuario === usuarioId && 
               p.tipoPrestamo === 'qr' &&
               (!p.horaDevolucion || p.horaDevolucion === '');
      });
    }),
    catchError(() => of(false))
  );
}


  obtenerPrestamosQRActivos(inventarioId: string): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.baseUrl}/qr-activos/${inventarioId}`, this.getHeaders());
  }











  

}