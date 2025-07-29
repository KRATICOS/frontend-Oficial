import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificacionReserva {
  _id: string;
  equipoId: string;
  equipoNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioImagen?: string;
  horaInicio: string;
  horaFin?: string;
  horaFinNumero?: number;
  observaciones?: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Devolución Confirmada' | 'Devolución Rechazada';
  fecha: Date | string;
  leida: boolean;
  notificacionesProgramadas?: number[];
  tipo: 'qr' | 'reserva' | 'devolucion';
  ultimaNotificacionVencida?: Date;
  prestamoId?: string;
  activada?: boolean;
  notificacionDevolucionEnviada?: boolean;
  extra?: {
    type?: string;
    minutosRestantes?: number;
    minutosVencidos?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificacionesSubject = new BehaviorSubject<NotificacionReserva[]>([]);
  public readonly notificaciones$: Observable<NotificacionReserva[]> = this.notificacionesSubject.asObservable();
  private readonly storageKey = 'reservas_notificaciones';
  private intervalId: any;
  private cambiosSubject = new Subject<void>();
  private bloqueoHoraSubject = new Subject<any>();
  private bloqueoHoraAutomaticoSubject = new Subject<any>();

  bloqueoHora$ = this.bloqueoHoraSubject.asObservable();
  bloqueoHoraAutomatico$ = this.bloqueoHoraAutomaticoSubject.asObservable();

  constructor() {
    this.cargarNotificacionesIniciales();
    this.iniciarMonitorDevoluciones();
  }

  get notificacionesActuales(): NotificacionReserva[] {
    return this.notificacionesSubject.value;
  }

  

  notificarCambios() {
    this.cambiosSubject.next();
  }

  obtenerCambiosObservable() {
    return this.cambiosSubject.asObservable();
  }

  notificarBloqueoHoraAutomatico(data: any) {
    this.bloqueoHoraAutomaticoSubject.next(data);
  }

  notificarBloqueoHora(data: {equipoId: string, hora: number, accion: 'bloquear' | 'desbloquear'}) {
    this.bloqueoHoraSubject.next(data);
  }

  private cargarNotificacionesIniciales() {
    try {
      const notificacionesGuardadas = localStorage.getItem(this.storageKey);
      if (notificacionesGuardadas) {
        const parsed = JSON.parse(notificacionesGuardadas);
        if (!Array.isArray(parsed)) {
          throw new Error('Formato de notificaciones inválido');
        }
        const notificacionesNormalizadas = parsed.map(n => this.normalizeNotification(n));
        this.notificacionesSubject.next(notificacionesNormalizadas);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      this.limpiarTodas();
    }
  }

  async marcarNotificacionDevolucionEnviada(notificacionId: string): Promise<void> {
  try {
    const actualizadas = this.notificacionesSubject.value.map(n => {
      if (n._id === notificacionId) {
        return { ...n, notificacionDevolucionEnviada: true };
      }
      return n;
    });

    this.notificacionesSubject.next(actualizadas);
    this.guardarNotificaciones(actualizadas);
  } catch (error) {
    console.error('Error marcando notificación como enviada:', error);
    throw error;
  }
}



  private iniciarMonitorDevoluciones() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.verificarDevolucionesPendientes();
    }, 300000); // 5 minutos
  }

  private async verificarDevolucionesPendientes() {
    const ahora = new Date();
    const { hours: horaActual, minutes: minutoActual } = {
      hours: ahora.getHours(),
      minutes: ahora.getMinutes()
    };

    for (const notif of this.notificacionesActuales) {
      if (notif.estado !== 'Aprobado') continue;

      const horaFin = this.obtenerHoraFin(notif);
      if (horaFin === null) continue;

      const minutosRestantes = (horaFin - horaActual) * 60 - minutoActual;

      if (minutosRestantes > 0 && minutosRestantes <= 30) {
        await this.notificarTiempoRestante(notif, minutosRestantes);
      } else if (minutosRestantes <= 0) {
        await this.notificarDevolucionVencida(notif, Math.abs(minutosRestantes));
      }
    }
  }

  private obtenerHoraFin(notif: NotificacionReserva): number | null {
    if (notif.tipo === 'qr') {
      return parseInt(notif.horaInicio.split(':')[0], 10) + 1;
    }
    if (notif.horaFin) {
      return parseInt(notif.horaFin.split(':')[0], 10);
    }
    return null;
  }

  private async notificarTiempoRestante(notif: NotificacionReserva, minutosRestantes: number) {
    const notifId = Math.floor(Math.random() * 10000);
    
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: notif.tipo === 'qr' ? 'Devolución QR próxima' : 'Devolución próxima',
          body: `Tienes ${minutosRestantes} minutos para devolver ${notif.equipoNombre}`,
          extra: {
            type: 'devolucion-proxima',
            notificacionId: notif._id,
            minutosRestantes: minutosRestantes
          }
        }]
      });

      await this.notificarAdminDevolucionProxima(notif, minutosRestantes);
    } catch (error) {
      console.error('Error en notificación de tiempo restante:', error);
    }
  }

  private async notificarDevolucionVencida(notif: NotificacionReserva, minutosVencidos: number) {
    const ahora = new Date();
    const ultimaNotificacion = notif.ultimaNotificacionVencida;
    const minutosDesdeUltimaNotif = ultimaNotificacion ? 
      (ahora.getTime() - ultimaNotificacion.getTime()) / 60000 : Infinity;

    if (minutosDesdeUltimaNotif >= 5) {
      const notifId = Math.floor(Math.random() * 10000);
      
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title: notif.tipo === 'qr' ? 'Devolución QR vencida' : 'Devolución vencida',
            body: `La devolución de ${notif.equipoNombre} está vencida por ${minutosVencidos} minutos`,
            extra: {
              type: 'devolucion-vencida',
              notificacionId: notif._id,
              minutosVencidos: minutosVencidos
            }
          }]
        });

        await this.notificarAdminDevolucionVencida(notif, minutosVencidos);
        this.actualizarUltimaNotificacion(notif._id, ahora);
      } catch (error) {
        console.error('Error en notificación de devolución vencida:', error);
      }
    }
  }

  private async notificarAdminDevolucionProxima(notif: NotificacionReserva, minutosRestantes: number) {
    const notifId = Math.floor(Math.random() * 10000);
    
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: notif.tipo === 'qr' ? 'Devolución QR próxima (Admin)' : 'Devolución próxima (Admin)',
          body: `El usuario ${notif.usuarioNombre} tiene ${minutosRestantes} minutos para devolver ${notif.equipoNombre}`,
          extra: {
            type: 'admin-devolucion-proxima',
            notificacionId: notif._id,
            minutosRestantes: minutosRestantes
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando al admin:', error);
    }
  }

  private async notificarAdminDevolucionVencida(notif: NotificacionReserva, minutosVencidos: number) {
    const notifId = Math.floor(Math.random() * 10000);
    
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: notif.tipo === 'qr' ? 'Devolución QR vencida (Admin)' : 'Devolución vencida (Admin)',
          body: `El usuario ${notif.usuarioNombre} no ha devuelto ${notif.equipoNombre} (${minutosVencidos} minutos de retraso)`,
          extra: {
            type: 'admin-devolucion-vencida',
            notificacionId: notif._id,
            minutosVencidos: minutosVencidos
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando al admin:', error);
    }
  }

  private actualizarUltimaNotificacion(notificacionId: string, fecha: Date) {
    try {
      const actual = this.notificacionesSubject.value.map(n => {
        if (n._id === notificacionId) {
          return { ...n, ultimaNotificacionVencida: fecha };
        }
        return n;
      });
      this.notificacionesSubject.next(actual);
      this.guardarNotificaciones(actual);
    } catch (error) {
      console.error('Error actualizando última notificación:', error);
    }
  }

  

  async notificarDevolucionExitosa(notif: NotificacionReserva) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: notif.tipo === 'qr' ? 'Devolución QR exitosa' : 'Devolución exitosa',
          body: `Has devuelto ${notif.equipoNombre} correctamente`,
          extra: {
            type: 'devolucion-exitosa',
            notificacionId: notif._id
          }
        }]
      });

      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: notif.tipo === 'qr' ? 'Devolución QR recibida' : 'Devolución recibida',
          body: `${notif.usuarioNombre} ha devuelto ${notif.equipoNombre}`,
          extra: {
            type: 'admin-devolucion-recibida',
            notificacionId: notif._id
          }
        }]
      });

      if (notif.notificacionesProgramadas?.length) {
        await LocalNotifications.cancel({ 
          notifications: notif.notificacionesProgramadas.map(id => ({ id })) 
        });
      }
    } catch (error) {
      console.error('Error notificando devolución exitosa:', error);
    }
  }

private guardarNotificaciones(notificaciones: NotificacionReserva[]) {
  try {
    const toSave = notificaciones.map(n => ({
      ...n,
      fecha: this.stringifyDate(n.fecha instanceof Date ? n.fecha : new Date(n.fecha)),
      ultimaNotificacionVencida: n.ultimaNotificacionVencida 
        ? this.stringifyDate(n.ultimaNotificacionVencida instanceof Date 
            ? n.ultimaNotificacionVencida 
            : new Date(n.ultimaNotificacionVencida))
        : undefined
    }));
    localStorage.setItem(this.storageKey, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error guardando notificaciones:', error);
  }
}

  async agregarNotificacion(nueva: Omit<NotificacionReserva, '_id' | 'fecha' | 'leida'>): Promise<NotificacionReserva> {
    try {
      if (!nueva.equipoId || !nueva.usuarioId) {
        throw new Error('Datos incompletos para la notificación');
      }

      const notificacionCompleta: NotificacionReserva = {
        ...nueva,
        _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fecha: new Date(),
        leida: false,
        notificacionesProgramadas: [],
        tipo: nueva.tipo || 'reserva',
        activada: false,
        notificacionDevolucionEnviada: false
      };

      const actual = this.notificacionesSubject.value;
      const actualizadas = [...actual, notificacionCompleta];
      this.notificacionesSubject.next(actualizadas);
      this.guardarNotificaciones(actualizadas);
      
      return notificacionCompleta;
    } catch (error) {
      console.error('Error al agregar notificación:', error);
      throw error;
    }
  }

  async solicitarDevolucion(equipoId: string, usuarioId: string, prestamoId: string): Promise<NotificacionReserva> {
    try {
      const solicitudExistente = this.notificacionesActuales.find(
        n => n.equipoId === equipoId && 
             n.usuarioId === usuarioId && 
             n.tipo === 'devolucion' && 
             n.estado === 'Pendiente'
      );

      if (solicitudExistente) {
        throw new Error('Ya existe una solicitud de devolución pendiente');
      }

      const notificacion = await this.agregarNotificacion({
        equipoId: equipoId,
        equipoNombre: 'Equipo', // Deberías obtener el nombre real del equipo
        usuarioId: usuarioId,
        usuarioNombre: 'Usuario', // Deberías obtener el nombre real del usuario
        horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        estado: 'Pendiente',
        tipo: 'devolucion',
        observaciones: 'Solicitud de devolución del equipo',
        prestamoId: prestamoId
      });

      await this.notificarAdministradores(
        'Solicitud de Devolución',
        `El usuario ha solicitado devolver el equipo`,
        notificacion._id
      );

      return notificacion;
    } catch (error) {
      console.error('Error en solicitarDevolucion:', error);
      throw error;
    }
  }

  async confirmarDevolucion(notificacionId: string, aceptada: boolean): Promise<void> {
    const notificacion = this.notificacionesActuales.find(n => n._id === notificacionId);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    try {
      const estado = aceptada ? 'Devolución Confirmada' : 'Devolución Rechazada';
      await this.actualizarEstado(notificacionId, estado);

      const titulo = aceptada ? 'Devolución Aceptada' : 'Devolución Rechazada';
      const mensaje = aceptada 
        ? `El administrador ha aceptado la devolución del equipo`
        : `El administrador ha rechazado la devolución del equipo. Por favor, contacta al administrador.`;

      await this.enviarNotificacionUsuario(
        notificacion.usuarioId,
        titulo,
        mensaje,
        notificacion._id
      );

      if (aceptada) {
        await this.notificarDevolucionExitosa(notificacion);
      }
    } catch (error) {
      console.error('Error en confirmarDevolucion:', error);
      throw error;
    }
  }

  async notificarAdministradores(titulo: string, mensaje: string, notificacionId: string): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: titulo,
          body: mensaje,
          extra: {
            type: 'admin-notification',
            notificacionId
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando a administradores:', error);
      throw error;
    }
  }

  async enviarNotificacionUsuario(usuarioId: string, titulo: string, mensaje: string, notificacionId: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: titulo,
          body: mensaje,
          extra: {
            usuarioId,
            notificacionId
          }
        }]
      });
    } catch (error) {
      console.error('Error enviando notificación al usuario:', error);
    }
  }

  async actualizarEstado(id: string, nuevoEstado: 'Aprobado' | 'Rechazado' | 'Devolución Confirmada' | 'Devolución Rechazada') {
    try {
      const actual = this.notificacionesSubject.value.map(n => {
        if (n._id === id) {
          if (nuevoEstado === 'Rechazado' && n.notificacionesProgramadas?.length) {
            LocalNotifications.cancel({ notifications: n.notificacionesProgramadas.map(id => ({ id })) });
          }
          return { ...n, estado: nuevoEstado };
        }
        return n;
      });
      this.notificacionesSubject.next(actual);
      this.guardarNotificaciones(actual);
    } catch (error) {
      console.error('Error actualizando estado:', error);
      throw error;
    }
  }

  async marcarReservaComoActivada(notificacionId: string, prestamoId: string): Promise<void> {
    try {
      const actual = this.notificacionesSubject.value.map(n => {
        if (n._id === notificacionId) {
          return { ...n, activada: true, prestamoId };
        }
        return n;
      });
      this.notificacionesSubject.next(actual);
      this.guardarNotificaciones(actual);
    } catch (error) {
      console.error('Error marcando reserva como activada:', error);
      throw error;
    }
  }

  async actualizarEstadoEquipoReserva(notificacionId: string, estado: string): Promise<void> {
    try {
      const actual = this.notificacionesSubject.value.map(n => {
        if (n._id === notificacionId) {
          return { ...n, estadoEquipo: estado };
        }
        return n;
      });
      this.notificacionesSubject.next(actual);
      this.guardarNotificaciones(actual);
    } catch (error) {
      console.error('Error actualizando estado de equipo en reserva:', error);
      throw error;
    }
  }

  async eliminarNotificacion(id: string) {
    try {
      const notificacion = this.notificacionesSubject.value.find(n => n._id === id);
      if (notificacion?.notificacionesProgramadas?.length) {
        await LocalNotifications.cancel({ notifications: notificacion.notificacionesProgramadas.map(id => ({ id })) });
      }
      
      const actual = this.notificacionesSubject.value.filter(n => n._id !== id);
      this.notificacionesSubject.next(actual);
      this.guardarNotificaciones(actual);
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      throw error;
    }
  }

  obtenerPorEstado(estado: 'Pendiente' | 'Aprobado' | 'Rechazado'): NotificacionReserva[] {
    return this.notificacionesSubject.value.filter(n => n.estado === estado);
  }

  limpiarTodas() {
    this.notificacionesSubject.next([]);
    localStorage.removeItem(this.storageKey);
  }

  marcarComoLeida(id: string) {
    const actual = this.notificacionesSubject.value.map(n => {
      if (n._id === id) {
        return { ...n, leida: true };
      }
      return n;
    });
    this.notificacionesSubject.next(actual);
    this.guardarNotificaciones(actual);
  }

  private parseDate(value: string | Date | undefined): Date {
    if (!value) return new Date();
    return typeof value === 'string' ? new Date(value) : value;
  }

  private stringifyDate(date: Date): string {
    return date.toISOString();
  }

  private normalizeNotification(notif: any): NotificacionReserva {
    return {
      ...notif,
      fecha: this.parseDate(notif.fecha),
      ultimaNotificacionVencida: notif.ultimaNotificacionVencida ? 
        this.parseDate(notif.ultimaNotificacionVencida) : undefined,
      notificacionesProgramadas: notif.notificacionesProgramadas || [],
      activada: notif.activada || false,
      notificacionDevolucionEnviada: notif.notificacionDevolucionEnviada || false
    };
  }
}