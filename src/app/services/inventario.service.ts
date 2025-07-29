import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inventario } from '../interface';
import { Observable, firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { ToastController } from '@ionic/angular';
import { HistorialService } from './historial.service';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private baseUrl = `${environment.apiUrl}${environment.endpoints.inventario}`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private toastController = inject(ToastController);
  private historialService = inject(HistorialService);

  
  constructor() { }

  async toggleEstadoPorUsuario(id: string): Promise<void> {
    try {
      const user = JSON.parse(localStorage.getItem('User') || '{}');
      if (!user?._id) throw new Error('Debes iniciar sesión');

      const equipo = await firstValueFrom(this.EquiposId(id));
      if (!equipo || !equipo?._id) throw new Error('Equipo no válido');

      const ahora = new Date();
      const horaActual = ahora.getHours();
      const horaString = `${horaActual}:00`;

      if (equipo.estado === 'Disponible') {
        // Registrar préstamo en historial
        await firstValueFrom(
          this.historialService.registrarPrestamo({
            inventarioId: id,
            usuarioId: user._id,
            horaSolicitud: horaString,
            tipoPrestamo: 'reserva'
          })
        );

        // Cambiar estado del equipo a Ocupado
        await firstValueFrom(this.ActualizarEquipos(id, {
          estado: 'Ocupado'
        }));

        // Crear notificación
        await this.notificationService.agregarNotificacion({
          equipoId: equipo._id,
          equipoNombre: equipo.name,
          usuarioId: user._id,
          usuarioNombre: user.name,
          horaInicio: horaString,
          estado: 'Aprobado',
          tipo: 'reserva'
        });

        await this.mostrarToast(`Préstamo registrado para ${equipo.name}`, 'success');

      } else if (equipo.estado === 'Ocupado') {
        // Buscar préstamo activo de este usuario y equipo
        const prestamos = await firstValueFrom(
          this.historialService.obtenerHistorial()
        );

        const prestamoActivo = prestamos.find((p: any) => {
          const idEquipo = typeof p.inventarioId === 'string'
            ? p.inventarioId
            : p.inventarioId?._id;
          const idUsuario = typeof p.usuarioId === 'string'
            ? p.usuarioId
            : p.usuarioId?._id;
          return idEquipo === id && idUsuario === user._id && !p.horaDevolucion;
        });

        if (!prestamoActivo) {
          throw new Error('Este equipo está ocupado por otro usuario');
        }

        // Registrar devolución en historial
            await firstValueFrom(
          this.historialService.registrarDevolucion(prestamoActivo._id, {
            horaDevolucion: horaString,
            estado: 'Disponible'
          })
        );

        // Cambiar estado del equipo a Disponible
        await firstValueFrom(this.ActualizarEquipos(id, {
          estado: 'Disponible'
        }));

        // Crear notificación de devolución
        await this.notificationService.agregarNotificacion({
          equipoId: equipo._id,
          equipoNombre: equipo.name,
          usuarioId: user._id,
          usuarioNombre: user.name,
          horaInicio: prestamoActivo.horaSolicitud,
          horaFin: horaString,
          estado: 'Aprobado',
          tipo: 'reserva'
        });

        await this.mostrarToast(`Devolución registrada para ${equipo.name}`, 'success');
      }
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      await this.mostrarToast(error.message, 'danger');
      throw error;
    }
  }

  buscarPorNumeroSerie(nseries: string): Observable<Inventario> {
    return this.http.get<Inventario>(`${this.baseUrl}/por-serie/${nseries}`);
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  registrarEquipoConImagenes(formData: FormData): Observable<Inventario> {
    return this.http.post<Inventario>(`${this.baseUrl}/crear`, formData);
  }

  Equipos(): Observable<Inventario[]> {
    return this.http.get<Inventario[]>(this.baseUrl);
  }

  EquiposId(id: string): Observable<Inventario> {
    return this.http.get<Inventario>(`${this.baseUrl}/${id}`);
  }

  ActualizarEquipos(id: string, data: Partial<Inventario>): Observable<Inventario> {
    return this.http.put<Inventario>(`${this.baseUrl}/${id}`, data);
  }

  eliminarEquipo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  actualizarEquipo(id: string, data: Inventario | FormData): Observable<any> {
    let headers = new HttpHeaders();

    if (!(data instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return this.http.put(`${this.baseUrl}/${id}`, data, { headers });
  }

  obtenerPorCategoria(categoria: string): Observable<Inventario[]> {
    return this.http.get<Inventario[]>(`${this.baseUrl}/categoria/${categoria}`);
  }

  obtenerPorEstado(estado: string): Observable<Inventario[]> {
    return this.http.get<Inventario[]>(`${this.baseUrl}/estado/${encodeURIComponent(estado)}`);
  }

  actualizarEstado(id: string, estado: string): Observable<Inventario> {
    return this.http.put<Inventario>(`${this.baseUrl}/${id}`, { estado });
  }


    async actualizarEstadoAutomatico(id: string, estado: string): Promise<void> {
    try {
      await firstValueFrom(this.ActualizarEquipos(id, { estado: estado as 'Disponible' | 'Ocupado' | 'En Mantenimiento' }));

      console.log(`Estado actualizado a ${estado} para equipo ${id}`);
    } catch (error) {
      console.error('Error actualizando estado automático:', error);
    }
  }

}
