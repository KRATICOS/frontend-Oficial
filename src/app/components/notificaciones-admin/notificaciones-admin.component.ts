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
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
  }

  private setupNotifications(): void {
    this.cargarNotificaciones();
    this.notificationSubscription = this.notificationService.notificaciones$.subscribe({
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
      default: return 'medium';
    }
  }

  getIconoEstado(estado: NotificacionReserva['estado']): string {
    switch (estado) {
      case 'Pendiente': return 'time';
      case 'Aprobado': return 'checkmark-circle';
      case 'Rechazado': return 'close-circle';
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