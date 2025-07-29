import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton, IonLabel,
  IonContent, IonList, IonItemSliding, IonItem, IonBadge, IonItemOptions,
  IonItemOption, IonIcon, AlertController, ToastController, IonAvatar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, trash, time, qrCode, alarm, notificationsOff } from 'ionicons/icons';
import { LocalNotifications, NotificationChannel } from '@capacitor/local-notifications';
import { NotificationService, NotificacionReserva } from '../../services/notification.service';
import { InventarioService } from '../../services/inventario.service';
import { ServiceService } from '../../services/service.service';
import { lastValueFrom } from 'rxjs';
import { HistorialService } from '../../services/historial.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-notificaciones-admin',
  templateUrl: './notificaciones-admin.component.html',
  styleUrls: ['./notificaciones-admin.component.scss'],
  standalone: true,
  imports: [IonButtons, 
    IonButton, IonAvatar, CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton, IonLabel,
    IonContent, IonList, IonItem, IonBadge, IonIcon
  ]
})
export class NotificacionesAdminComponent implements OnInit, OnDestroy {
  notificaciones: NotificacionReserva[] = [];
  segmento: 'pendientes' | 'aprobadas' | 'rechazadas' | 'qr' | 'devoluciones' = 'pendientes';
  private intervalSubscription?: Subscription;
  private notificationSubscription?: Subscription;

  constructor() {
    addIcons({checkmarkCircle, closeCircle, trash, notificationsOff, time, qrCode, alarm});
  }
  private notificationService = inject(NotificationService);
  private alertController = inject(AlertController);
  private inventarioService = inject(InventarioService);
  private userService = inject(ServiceService);
  private toastController = inject(ToastController);
  private historialService = inject(HistorialService);

  ngOnInit(): void {
    this.setupNotifications();
    this.startReservaMonitoring();
    setInterval(() => {
    this.verificarReservasParaActivar();
  }, 60 * 1000);
  }

  ngOnDestroy(): void {
    this.intervalSubscription?.unsubscribe();
    this.notificationSubscription?.unsubscribe();
  }

  private setupNotifications(): void {
    this.cargarNotificaciones();
    this.notificationSubscription = this.notificationService.notificaciones$.subscribe({
      next: () => this.cargarNotificaciones(),
      error: (err) => console.error('Error en suscripción:', err)
    });
  }

  private startReservaMonitoring(): void {
    this.intervalSubscription = interval(60000).subscribe(() => {
      this.verificarReservasParaActivar();
      this.verificarDevolucionesPendientes();
    });
  }


  private async activarReserva(reserva: NotificacionReserva) {
    try {
      // ACTUALIZAR ESTADO A OCUPADO AL INICIAR LA HORA
      await this.inventarioService.actualizarEstadoAutomatico(
        reserva.equipoId, 
        'Ocupado'
      );
      
      const fechaReserva = reserva.fecha instanceof Date 
        ? reserva.fecha.toISOString().split('T')[0] 
        : reserva.fecha;
      
      const registro = await lastValueFrom(this.historialService.registrarPrestamo({
        inventarioId: reserva.equipoId,
        usuarioId: reserva.usuarioId,
        fecha: fechaReserva,
        horaSolicitud: reserva.horaInicio,
        horaDevolucion: reserva.horaFin,
        tipoPrestamo: 'reserva',
        estado: 'Ocupado' // ESTADO ACTUALIZADO
      }));

      await this.notificationService.marcarReservaComoActivada(reserva._id, registro._id);
    } catch (error) {
      console.error(`Error activando reserva ${reserva._id}:`, error);
    }
  }

async verificarReservasParaActivar() {
  try {
    const todas = this.notificationService.notificacionesActuales;
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0];
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();

    const reservasParaActivar = todas.filter(n => {
      if (n.estado !== 'Aprobado' || n.tipo !== 'reserva' || n.activada) return false;

      const fechaNotificacion = n.fecha instanceof Date
        ? n.fecha.toISOString().split('T')[0]
        : n.fecha.split('T')[0];

      if (fechaNotificacion !== fechaActual) return false;

      const [horaReservaStr, minutoReservaStr] = n.horaInicio.split(':');
      const horaReserva = parseInt(horaReservaStr, 10);
      const minutoReserva = parseInt(minutoReservaStr || '0', 10);

      // Verificar si estamos dentro del rango de tiempo de la reserva
      const minutosTotalesActual = horaActual * 60 + minutosActual;
      const minutosTotalesReserva = horaReserva * 60 + minutoReserva;
      
      // Si la hora actual es igual o mayor a la hora de inicio de reserva
      // Y menor que la hora de fin (si existe)
      if (minutosTotalesActual >= minutosTotalesReserva) {
        if (n.horaFin) {
          const [horaFinStr, minutoFinStr] = n.horaFin.split(':');
          const horaFin = parseInt(horaFinStr, 10);
          const minutoFin = parseInt(minutoFinStr || '0', 10);
          const minutosTotalesFin = horaFin * 60 + minutoFin;
          
          return minutosTotalesActual < minutosTotalesFin;
        }
        return true;
      }
      return false;
    });

    for (const reserva of reservasParaActivar) {
      // Solo activar si no está ya activada
      if (!reserva.activada) {
        await this.activarReserva(reserva);
      }
    }
  } catch (error) {
    console.error('Error al verificar reservas para activar:', error);
  }
}


  async verificarDevolucionesPendientes() {
    try {
      const ahora = new Date();
      const fechaActual = ahora.toISOString().split('T')[0];
      const horaActual = ahora.getHours();

      const devolucionesPendientes = this.notificationService.notificacionesActuales
        .filter(n => n.estado === 'Aprobado' && n.tipo === 'reserva' && n.horaFin)
        .filter(n => {
          const fechaNotificacion = n.fecha instanceof Date ? n.fecha.toISOString().split('T')[0] : n.fecha;
          const horaFin = parseInt(n.horaFin?.split(':')[0] || '0', 10);
          return fechaNotificacion === fechaActual && horaActual >= horaFin;
        });

      for (const notif of devolucionesPendientes) {
        if (!notif.notificacionDevolucionEnviada) {
          // Enviar notificación de devolución usando el método existente
          await this.notificationService.enviarNotificacionUsuario(
            notif.usuarioId,
            'Devolución Pendiente',
            `Por favor, devuelve ${notif.equipoNombre}`,
            notif._id
          );
          // Marcar como enviada
          await this.notificationService.marcarNotificacionDevolucionEnviada(notif._id);
        }
      }
    } catch (error) {
      console.error('Error verificando devoluciones pendientes:', error);
    }
  }

  cargarNotificaciones(): void {
    try {
      const todas = this.notificationService.notificacionesActuales;
      this.notificaciones = this.filtrarNotificaciones(todas);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }

  private filtrarNotificaciones(lista: NotificacionReserva[]): NotificacionReserva[] {
    switch (this.segmento) {
      case 'pendientes': 
        return lista.filter(n => n.estado === 'Pendiente' && n.tipo !== 'qr');
      case 'aprobadas': 
        return lista.filter(n => n.estado === 'Aprobado' && n.tipo !== 'qr');
      case 'rechazadas': 
        return lista.filter(n => n.estado === 'Rechazado');
      case 'qr': 
        return lista.filter(n => n.tipo === 'qr');
      case 'devoluciones': 
        return lista.filter(n => n.tipo === 'devolucion' && n.estado === 'Pendiente');
      default: 
        return lista;
    }
  }

  segmentChanged(ev: CustomEvent) {
    this.segmento = ev.detail.value;
    this.cargarNotificaciones();
  }

  async aprobar(notif: NotificacionReserva) {
    try {
      await this.notificationService.actualizarEstado(notif._id, 'Aprobado');
      
      await Promise.all([
        this.mostrarToast(`Reserva aprobada para ${notif.usuarioNombre}`, 'success'),
        this.notificationService.enviarNotificacionUsuario(
          notif.usuarioId,
          'Reserva Aprobada',
          `Tu reserva para ${notif.equipoNombre} ha sido aprobada`,
          notif._id
        )
      ]);
    } catch (error) {
      console.error('Error al aprobar reserva:', error);
      await this.mostrarToast('Error al aprobar la reserva', 'danger');
    }
  }

  async rechazar(notif: NotificacionReserva) {
    try {
      await this.notificationService.actualizarEstado(notif._id, 'Rechazado');
      
      await Promise.all([
        this.mostrarToast(`Reserva rechazada para ${notif.usuarioNombre}`, 'warning'),
        this.notificationService.enviarNotificacionUsuario(
          notif.usuarioId,
          'Reserva Rechazada',
          `Tu reserva para ${notif.equipoNombre} ha sido rechazada`,
          notif._id
        )
      ]);
    } catch (error) {
      console.error('Error al rechazar reserva:', error);
      await this.mostrarToast('Error al rechazar la reserva', 'danger');
    }
  }

  async aprobarQR(notif: NotificacionReserva) {
    try {
      await this.notificationService.actualizarEstado(notif._id, 'Aprobado');
      
      // Registrar préstamo QR en historial
      const registro = await lastValueFrom(this.historialService.registrarPrestamo({
        inventarioId: notif.equipoId,
        usuarioId: notif.usuarioId,
        fecha: new Date().toISOString().split('T')[0],
        horaSolicitud: `${new Date().getHours()}:00`,
        tipoPrestamo: 'qr',
        estado: 'Ocupado'
      }));

      // Marcar equipo como ocupado
      await lastValueFrom(this.inventarioService.ActualizarEquipos(notif.equipoId, { estado: 'Ocupado' }));

      await Promise.all([
        this.mostrarToast(`Préstamo QR aprobado para ${notif.usuarioNombre}`, 'success'),
        this.notificationService.enviarNotificacionUsuario(
          notif.usuarioId,
          'Préstamo QR Aprobado',
          `Tu préstamo QR para ${notif.equipoNombre} ha sido aprobado`,
          notif._id
        )
      ]);
    } catch (error) {
      console.error('Error al aprobar préstamo QR:', error);
      await this.mostrarToast('Error al aprobar préstamo QR', 'danger');
    }
  }


  async manejarDevolucion(notif: NotificacionReserva, aceptada: boolean) {
    const alert = await this.alertController.create({
      header: aceptada ? 'Confirmar Devolución' : 'Rechazar Devolución',
      message: aceptada 
        ? '¿Confirmar que el material ha sido devuelto correctamente?' 
        : '¿Rechazar la devolución del material?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: aceptada ? 'Confirmar' : 'Rechazar',
          handler: async () => {
            try {
              // Procesar devolución
              await this.procesarDevolucion(notif, aceptada);
              
              this.mostrarToast(
                aceptada ? 'Devolución confirmada' : 'Devolución rechazada',
                aceptada ? 'success' : 'warning'
              );
            } catch (error) {
              console.error('Error manejando devolución:', error);
              this.mostrarToast('Error al procesar devolución', 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  private async procesarDevolucion(notif: NotificacionReserva, aceptada: boolean) {
    if (aceptada) {
      // Actualizar estado del equipo
      await lastValueFrom(this.inventarioService.ActualizarEquipos(notif.equipoId, { estado: 'Disponible' }));
      
      // Registrar devolución en historial
      if (notif.prestamoId) {
        await lastValueFrom(this.historialService.registrarDevolucion(notif.prestamoId));
      }
      
      // Notificar al usuario
      await this.notificationService.enviarNotificacionUsuario(
        notif.usuarioId,
        'Devolución Confirmada',
        `La devolución de ${notif.equipoNombre} ha sido confirmada`,
        notif._id
      );
    } else {
      // Notificar al usuario que la devolución fue rechazada
      await this.notificationService.enviarNotificacionUsuario(
        notif.usuarioId,
        'Devolución Rechazada',
        `La devolución de ${notif.equipoNombre} ha sido rechazada. Por favor, contacta al administrador.`,
        notif._id
      );
    }
    
    // Actualizar estado de la notificación
    await this.notificationService.actualizarEstado(
      notif._id, 
      aceptada ? 'Devolución Confirmada' : 'Devolución Rechazada'
    );
  }

  puedeEliminar(notif: NotificacionReserva): boolean {
  return (
    notif.estado === 'Aprobado' || 
    notif.estado === 'Rechazado' || 
    notif.tipo === 'qr' || 
    notif.tipo === 'devolucion'
  );
}

async eliminar(id: string) {
  const alert = await this.alertController.create({
    header: 'Confirmar eliminación',
    message: '¿Estás seguro de que quieres eliminar esta notificación?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Eliminar',
        handler: async () => {
          try {
            await this.notificationService.eliminarNotificacion(id);
            this.cargarNotificaciones(); // Actualizar la lista
            await this.mostrarToast('Notificación eliminada', 'success');
          } catch (error) {
            console.error('Error eliminando notificación:', error);
            await this.mostrarToast('Error al eliminar notificación', 'danger');
          }
        }
      }
    ]
  });
  await alert.present();
}


  getColorEstado(estado: NotificacionReserva['estado']): string {
    switch (estado) {
      case 'Pendiente': return 'warning';
      case 'Aprobado': return 'success';
      case 'Rechazado': return 'danger';
      case 'Devolución Confirmada': return 'success';
      case 'Devolución Rechazada': return 'danger';
      default: return 'medium';
    }
  }

  getIconoEstado(estado: NotificacionReserva['estado']): string {
    switch (estado) {
      case 'Pendiente': return 'time';
      case 'Aprobado': return 'checkmark-circle';
      case 'Rechazado': return 'close-circle';
      case 'Devolución Confirmada': return 'checkmark-circle';
      case 'Devolución Rechazada': return 'close-circle';
      default: return 'help-circle';
    }
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }
}