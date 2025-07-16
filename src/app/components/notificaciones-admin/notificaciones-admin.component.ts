import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton, IonLabel,
  IonContent, IonList, IonItemSliding, IonItem, IonBadge, IonItemOptions,
  IonItemOption, IonIcon, AlertController, ToastController, IonAvatar, IonButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, trash, time, qrCode, alarm } from 'ionicons/icons';

import { NotificationService, NotificacionReserva } from '../../services/notification.service';
import { InventarioService } from '../../services/inventario.service';
import { ServiceService } from '../../services/service.service';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-notificaciones-admin',
  templateUrl: './notificaciones-admin.component.html',
  styleUrls: ['./notificaciones-admin.component.scss'],
  standalone: true,
  imports: [
    IonButton, IonAvatar, CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton, IonLabel,
    IonContent, IonList ,IonItem, IonBadge,  IonIcon
  ]
})
export class NotificacionesAdminComponent implements OnInit {
  notificaciones: NotificacionReserva[] = [];
  segmento: 'pendientes' | 'aprobadas' | 'rechazadas' | 'qr' | 'devoluciones' = 'pendientes';

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, trash, time, qrCode, alarm });
  }

  private notificationService = inject(NotificationService);
  private alertController = inject(AlertController);
  private inventarioService = inject(InventarioService);
  private userService = inject(ServiceService);
  private toastController = inject(ToastController);

  ngOnInit(): void {
    this.setupNotifications();
  }

  private setupNotifications(): void {
    this.cargarNotificaciones();
    this.notificationService.notificaciones$.subscribe({
      next: () => this.cargarNotificaciones(),
      error: (err) => console.error('Error en suscripción:', err)
    });
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
        return this.filtrarDevolucionesPendientes(lista);
      default: 
        return lista;
    }
  }

private filtrarDevolucionesPendientes(lista: NotificacionReserva[]): NotificacionReserva[] {
  return lista.filter(n => {
    if (n.estado === 'Aprobado' && n.tipo === 'reserva' && n.horaFin) {
      try {
        const fechaFin = new Date(n.fecha);
        const horaFin = parseInt(n.horaFin.split(':')[0], 10);
        fechaFin.setHours(horaFin, 0, 0, 0);
        return new Date().getTime() > fechaFin.getTime();
      } catch (error) {
        console.error('Error procesando fecha:', error);
        return false;
      }
    }
    return false;
  });
}

  segmentChanged(ev: CustomEvent) {
    this.segmento = ev.detail.value;
    this.cargarNotificaciones();
  }

  getIconForTipo(tipo: string | undefined): string {
    return tipo === 'qr' ? 'qr-code' : 'notifications';
  }

  async aprobar(notif: NotificacionReserva) {
    try {
      await this.inventarioService.ActualizarEquipos(notif.equipoId, { estado: 'Ocupado' }).toPromise();
      this.notificationService.actualizarEstado(notif._id, 'Aprobado');
      
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
      this.notificationService.actualizarEstado(notif._id, 'Rechazado');
      
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

  async marcarComoDevuelto(notif: NotificacionReserva) {
    try {
      await this.inventarioService.ActualizarEquipos(notif.equipoId, { estado: 'Disponible' }).toPromise();
      
      await Promise.all([
        this.notificationService.notificarDevolucionExitosa(notif),
        this.mostrarToast(`Devolución registrada para ${notif.equipoNombre}`, 'success')
      ]);
    } catch (error) {
      console.error('Error al marcar como devuelto:', error);
      await this.mostrarToast('Error al registrar devolución', 'danger');
    }
  }

  async eliminar(id: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: '¿Eliminar esta notificación?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              await this.notificationService.eliminarNotificacion(id);
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
      case 'Devolución Próxima': return 'warning';
      case 'Devolución Vencida': return 'danger';
      default: return 'medium';
    }
  }

  getIconoEstado(estado: NotificacionReserva['estado']): string {
    switch (estado) {
      case 'Pendiente': return 'time';
      case 'Aprobado': return 'checkmark-circle';
      case 'Rechazado': return 'close-circle';
      case 'Devolución Próxima': return 'alarm';
      case 'Devolución Vencida': return 'alarm';
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