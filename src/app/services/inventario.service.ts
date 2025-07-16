import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inventario } from '../interface';
import { Observable, firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private baseUrl = `${environment.apiUrl}${environment.endpoints.inventario}`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private toastController = inject(ToastController);

  constructor() { }

  async toggleEstadoPorUsuario(id: string): Promise<void> {
    try {
      const user = JSON.parse(localStorage.getItem('User') || '{}');
      if (!user?._id) throw new Error('Debes iniciar sesión');

      const equipo = await firstValueFrom(this.EquiposId(id));
      if (!equipo?._id) throw new Error('Equipo no válido'); // Validación adicional

      const ahora = new Date();
      const horaActual = ahora.getHours();
      const horaFin = horaActual + 1;

      if (equipo.estado === 'Disponible') {
        await firstValueFrom(this.ActualizarEquipos(id, { estado: 'Ocupado' }));

        // Aseguramos que equipo._id existe con el operador !
        const notificacion = await this.notificationService.agregarNotificacion({
          equipoId: equipo._id!, // Usamos el operador ! para asegurar que no es undefined
          equipoNombre: equipo.name || 'Equipo sin nombre',
          usuarioId: user._id,
          usuarioNombre: user.name || 'Usuario anónimo',
          horaInicio: `${horaActual}:00`,
          horaFin: `${horaFin}:00`,
          estado: 'Aprobado',
          tipo: 'qr'
        });

        await this.mostrarToast(`Préstamo registrado para ${equipo.name}`, 'success');
      } else if (equipo.estado === 'Ocupado') {
        // Verificar si el mismo usuario tiene el equipo
        const notificaciones = this.notificationService.notificacionesActuales;
        const prestamoActual = notificaciones.find(n =>
          n.equipoId === id &&
          n.estado === 'Aprobado' &&
          n.tipo === 'qr' &&
          !n.horaFin && // Solo préstamos activos
          n.usuarioId === user._id
        );

        if (prestamoActual) {
          // Actualizar estado en backend
          await firstValueFrom(this.ActualizarEquipos(id, { estado: 'Disponible' }));

          // Marcar como devuelto en la notificación
          await this.notificationService.agregarNotificacion({
            equipoId: equipo._id,
            equipoNombre: equipo.name,
            usuarioId: user._id,
            usuarioNombre: user.name,
            horaInicio: prestamoActual.horaInicio,
            horaFin: `${horaFin}:00`,
            estado: 'Aprobado',
            tipo: 'qr'
          });

          await this.mostrarToast(`Devolución registrada para ${equipo.name}`, 'success');
        } else {
          throw new Error('Este equipo está ocupado por otro usuario');
        }
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

  getEquiposId(id: string) {
    return this.http.get(`http://localhost:3001/api/inventario/${id}`);
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
    const url = `${this.baseUrl}/estado/${encodeURIComponent(estado)}`;
    return this.http.get<Inventario[]>(url);
  }
}