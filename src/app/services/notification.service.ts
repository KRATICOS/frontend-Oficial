import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable,Subject } from 'rxjs';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificacionReserva {
  _id: string;
  equipoId: string;
  equipoNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioImagen?: string;
  horaInicio: string;
  horaFin?: string;                                    // opcional ⇢ solo reservas
  observaciones?: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' |
          'Devolución Próxima' | 'Devolución Vencida';
  fecha: Date;
  leida: boolean;
  notificacionesProgramadas?: number[];
  tipo: 'qr' | 'reserva';                              // ahora requerido
  ultimaNotificacionVencida?: Date;
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


  constructor() {
    this.cargarNotificacionesIniciales();
    this.iniciarMonitorDevoluciones();
  }

  get notificacionesActuales(): NotificacionReserva[] {
    return this.notificacionesSubject.value;
  }
  
  private cargarNotificacionesIniciales() {
    try {
      const notificacionesGuardadas = localStorage.getItem(this.storageKey);
      if (notificacionesGuardadas) {
        const notificaciones = JSON.parse(notificacionesGuardadas);
        const parsedNotificaciones = notificaciones.map((n: any) => ({
          ...n,
          fecha: new Date(n.fecha),
          notificacionesProgramadas: n.notificacionesProgramadas || [],
          ultimaNotificacionVencida: n.ultimaNotificacionVencida ? new Date(n.ultimaNotificacionVencida) : undefined
        }));
        this.notificacionesSubject.next(parsedNotificaciones);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      this.limpiarTodas();
    }
  }

  notificarCambios() {
  this.cambiosSubject.next();
}

obtenerCambiosObservable() {
  return this.cambiosSubject.asObservable();
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
      if (horaFin === null) continue;                 // no aplica

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
      return parseInt(notif.horaInicio.split(':')[0], 10) + 1; // 1 h después
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
    const actual = this.notificacionesSubject.value.map(n => {
      if (n._id === notificacionId) {
        return { ...n, ultimaNotificacionVencida: fecha };
      }
      return n;
    });
    this.notificacionesSubject.next(actual);
    this.guardarNotificaciones(actual);
  }

  async notificarDevolucionExitosa(notif: NotificacionReserva) {
    try {
      // Notificar al usuario
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

      // Notificar al admin
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

      // Cancelar notificaciones programadas
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
    localStorage.setItem(this.storageKey, JSON.stringify(notificaciones));
  }

  async agregarNotificacion(nueva: Omit<NotificacionReserva, '_id' | 'fecha' | 'leida'>): Promise<NotificacionReserva> {
    // Verificar si ya existe una notificación QR para este equipo sin horaFin
    if (nueva.tipo === 'qr') {
      const notifExistente = this.notificacionesActuales.find(n => 
        n.equipoId === nueva.equipoId && 
        n.tipo === 'qr' && 
        n.estado === 'Aprobado' && 
        !n.horaFin
      );
if (notifExistente) {
  /** devolución QR *********************************************/
  if (!nueva.horaFin) {
    throw new Error('horaFin es obligatoria al registrar una devolución QR');
  }

  const actual = this.notificacionesSubject.value.map(n => {
    if (n._id === notifExistente._id) {
      return {
        ...n,
        horaFin: nueva.horaFin,            // ← ya sabemos que existe
        estado: 'Aprobado' as const,
        notificacionesProgramadas: []
      };
    }
    return n;
  });

  this.notificacionesSubject.next(actual);
  this.guardarNotificaciones(actual);

  // ✅ horaFin garantizada
  await this.notificarDevolucionQR(notifExistente, nueva.horaFin);

  return actual.find(n => n._id === notifExistente._id)!;
      } else {
        // Es un nuevo préstamo QR
        await this.notificarPrestamoQR(nueva);
      }
    }

    const notificacionCompleta: NotificacionReserva = {
      ...nueva,
      _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fecha: new Date(),
      leida: false,
      notificacionesProgramadas: [],
      tipo: nueva.tipo || 'reserva'
    };

    try {
      await this.verificarPermisos();
      
      if (notificacionCompleta.tipo === 'qr') {
        // Notificaciones para QR ya se manejaron arriba
      } else {
        await this.notificarAdministradores(notificacionCompleta);
        
        if (notificacionCompleta.estado === 'Aprobado' || notificacionCompleta.estado === 'Rechazado') {
          await this.notificarUsuario(notificacionCompleta);
        }

        if (notificacionCompleta.estado === 'Aprobado') {
          const notifIds = await this.programarNotificaciones(notificacionCompleta);
          notificacionCompleta.notificacionesProgramadas = notifIds;
        }
      }

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

  private async notificarPrestamoQR(nueva: Omit<NotificacionReserva, '_id' | 'fecha' | 'leida'>) {
    try {
      // Notificación al usuario
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: 'Préstamo QR registrado',
          body: `Has tomado ${nueva.equipoNombre} correctamente`,
          extra: {
            tipo: 'qr-prestamo',
            equipoId: nueva.equipoId,
            usuarioId: nueva.usuarioId
          }
        }]
      });

      // Notificación a administradores
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: 'Nuevo préstamo QR',
          body: `${nueva.usuarioNombre} ha tomado ${nueva.equipoNombre} mediante QR`,
          extra: {
            tipo: 'admin-qr-prestamo',
            equipoId: nueva.equipoId
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando préstamo QR:', error);
    }
  }

  private async notificarDevolucionQR(notif: NotificacionReserva, horaFin: string) {
    try {
      // Notificación al usuario
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: 'Devolución QR registrada',
          body: `Has devuelto ${notif.equipoNombre} correctamente a las ${horaFin}`,
          extra: {
            tipo: 'qr-devolucion',
            equipoId: notif.equipoId,
            usuarioId: notif.usuarioId
          }
        }]
      });

      // Notificación a administradores
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title: 'Devolución QR registrada',
          body: `${notif.usuarioNombre} ha devuelto ${notif.equipoNombre} mediante QR a las ${horaFin}`,
          extra: {
            tipo: 'admin-qr-devolucion',
            equipoId: notif.equipoId
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando devolución QR:', error);
    }
  }

  private async programarNotificacionQR(notificacion: NotificacionReserva): Promise<number> {
    const notifId = Math.floor(Math.random() * 10000);
    try {
      const horaFin = parseInt(notificacion.horaInicio.split(':')[0]) + 1;
      const ahora = new Date();
      
      const scheduleTime = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        horaFin,
        0, // Minutos
        0  // Segundos
      );

      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: 'Devolución QR requerida',
          body: `Por favor, devuelve ${notificacion.equipoNombre}`,
          schedule: { at: scheduleTime },
          extra: { 
            reservaId: notificacion._id,
            tipo: 'qr-devolucion'
          }
        }]
      });
    } catch (error) {
      console.error('Error programando notificación QR:', error);
    }
    return notifId;
  }
  
  private async notificarAdministradores(notificacion: NotificacionReserva) {
    try {
      let title = '';
      let body = '';

      if (notificacion.tipo === 'qr') {
        title = notificacion.horaFin ? 'Devolución QR' : 'Préstamo QR';
        body = `${notificacion.usuarioNombre} ha ${notificacion.horaFin ? 'devuelto' : 'tomado'} ${notificacion.equipoNombre}`;
      } else {
        title = `Reserva ${notificacion.estado === 'Pendiente' ? 'pendiente' : notificacion.estado.toLowerCase()}`;
        body = `${notificacion.usuarioNombre} ha ${notificacion.estado === 'Pendiente' ? 'solicitado' : notificacion.estado === 'Aprobado' ? 'obtenido' : 'perdido'} ${notificacion.equipoNombre}`;
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title,
          body,
          extra: { 
            tipo: 'admin',
            notificacionId: notificacion._id 
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando a administradores:', error);
    }
  }

  private async notificarUsuario(notificacion: NotificacionReserva) {
    try {
      let title = '';
      let body = '';

      if (notificacion.tipo === 'qr') {
        title = notificacion.horaFin ? 'Devolución QR confirmada' : 'Préstamo QR confirmado';
        body = `Has ${notificacion.horaFin ? 'devuelto' : 'tomado'} ${notificacion.equipoNombre} correctamente`;
      } else {
        title = `Reserva ${notificacion.estado.toLowerCase()}`;
        body = `Tu reserva para ${notificacion.equipoNombre} ha sido ${notificacion.estado.toLowerCase()}`;
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 10000),
          title,
          body,
          extra: { 
            tipo: 'usuario',
            notificacionId: notificacion._id,
            usuarioId: notificacion.usuarioId
          }
        }]
      });
    } catch (error) {
      console.error('Error notificando al usuario:', error);
    }
  }

  private async verificarPermisos(): Promise<void> {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') {
        throw new Error('Permisos de notificación no concedidos');
      }
    }
  }

 private async programarNotificaciones(
    notificacion: NotificacionReserva
  ): Promise<number[]> {

    const notifIds: number[] = [];

    try {
      if (!notificacion.horaFin) {
        throw new Error('horaFin no definida para la reserva');
      }

      const startHour = parseInt(notificacion.horaInicio.split(':')[0], 10);
      const endHour   = parseInt(notificacion.horaFin.split(':')[0], 10);

      const now = new Date();

      const schedule30 = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        startHour - 1, 30
      );
      const scheduleLate = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        endHour, 15
      );

      if (schedule30 <= now || scheduleLate <= now) {
        throw new Error('Las fechas de notificación deben ser futuras');
      }

      const id30   = Math.floor(Date.now() / 1000) + 1;
      const idLate = id30 + 1;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: id30,
            title: 'Reserva próxima a activarse',
            body: `Tu reserva para ${notificacion.equipoNombre} se activará en 30 minutos.`,
            schedule: { at: schedule30 },
            extra: { reservaId: notificacion._id }
          },
          {
            id: idLate,
            title: 'Devolución atrasada',
            body: `Tu reserva para ${notificacion.equipoNombre} está atrasada. Devuelve el equipo.`,
            schedule: { at: scheduleLate },
            extra: { reservaId: notificacion._id }
          }
        ]
      });

      notifIds.push(id30, idLate);
    } catch (e) {
      console.error('Error programando notificaciones:', e);
      throw e;
    }
    return notifIds;
  }

  async actualizarEstado(id: string, nuevoEstado: 'Aprobado' | 'Rechazado') {
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
}