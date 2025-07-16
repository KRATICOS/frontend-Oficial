import { Component, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonBadge, IonAvatar, IonButton, IonIcon, IonToast, 
  IonAlert, AlertController, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, time, notifications, notificationsOff, alarm } from 'ionicons/icons';
import { LocalNotifications } from '@capacitor/local-notifications';

import { NotificationService, NotificacionReserva } from '../../services/notification.service';

@Component({
  selector: 'app-notificaciones-user',
  templateUrl: './notificaciones-user.component.html',
  styleUrls: ['./notificaciones-user.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonBadge, IonAvatar, IonButton, IonIcon, IonToast
  ]
})
export class NotificacionesUserComponent implements OnInit {
  notificaciones: NotificacionReserva[] = [];
  unreadCount = 0;
  showToast = false;
  toastMessage = '';
  toastColor = 'success';
  currentUser: any;

  constructor() {
    addIcons({ notificationsOff, checkmarkCircle, closeCircle, time, notifications, alarm });
  }

  private notificationService = inject(NotificationService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  async ngOnInit() {
    await this.initializeComponent();
  }

  private async initializeComponent() {
    try {
      this.currentUser = JSON.parse(localStorage.getItem('User') || '{}');
      if (!this.currentUser?._id) {
        console.error('Usuario no autenticado');
        return;
      }

      this.loadNotifications();
      this.setupNotificationSubscription();
      await this.setupPushListeners();
    } catch (error) {
      console.error('Error inicializando componente:', error);
    }
  }

  private loadNotifications() {
    try {
      const allNotifications = this.notificationService.notificacionesActuales;
      this.notificaciones = allNotifications.filter(n => n.usuarioId === this.currentUser._id);
      this.unreadCount = this.notificaciones.filter(n => !n.leida).length;
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }

  private setupNotificationSubscription() {
    this.notificationService.notificaciones$.subscribe({
      next: (notifs) => {
        this.notificaciones = notifs.filter(n => n.usuarioId === this.currentUser._id);
        this.unreadCount = this.notificaciones.filter(n => !n.leida).length;
        
        const newNotifications = this.getNewNotifications();
        if (newNotifications.length > 0) {
          this.showPushNotification(newNotifications);
        }
      },
      error: (err) => console.error('Error en suscripción de notificaciones:', err)
    });
  }

  private getNewNotifications(): NotificacionReserva[] {
    return this.notificaciones.filter(n => 
      !n.leida && (n.estado === 'Aprobado' || n.estado === 'Rechazado' || 
      n.estado === 'Devolución Próxima' || n.estado === 'Devolución Vencida')
    );
  }

  private async showPushNotification(notifications: NotificacionReserva[]) {
    if (!notifications.length) return;

    const latest = notifications[0];
    try {
      const { title, body } = this.getNotificationContent(latest);

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Math.floor(Math.random() * 10000),
          extra: { notificationId: latest._id }
        }]
      });
      
      this.showToastMessage(body, latest.estado);
      this.notificationService.marcarComoLeida(latest._id);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  private getNotificationContent(notification: NotificacionReserva): { title: string, body: string } {
    switch(notification.estado) {
      case 'Aprobado':
        return { 
          title: 'Reserva Aprobada',
          body: `Tu reserva para ${notification.equipoNombre} ha sido aprobada` 
        };
      case 'Rechazado':
        return { 
          title: 'Reserva Rechazada',
          body: `Tu reserva para ${notification.equipoNombre} ha sido rechazada` 
        };
      case 'Devolución Próxima':
        return { 
          title: 'Devolución Próxima',
          body: `Tienes poco tiempo para devolver ${notification.equipoNombre}` 
        };
      case 'Devolución Vencida':
        return { 
          title: 'Devolución Vencida',
          body: `La devolución de ${notification.equipoNombre} está vencida` 
        };
      default:
        return { title: 'Nueva notificación', body: 'Tienes una nueva notificación' };
    }
  }

  private showToastMessage(message: string, estado: string) {
    this.toastMessage = message;
    this.toastColor = this.getColorForEstado(estado);
    this.showToast = true;
  }

  private async setupPushListeners() {
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const notificationId = notification.notification.extra?.notificationId;
        if (notificationId) {
          this.notificationService.marcarComoLeida(notificationId);
        }
      });
    } catch (error) {
      console.error('Error configurando listeners de notificaciones:', error);
    }
  }

  getIconForEstado(estado: string): string {
    switch(estado) {
      case 'Aprobado': return 'checkmark-circle';
      case 'Rechazado': return 'close-circle';
      case 'Pendiente': return 'time';
      case 'Devolución Próxima': return 'alarm';
      case 'Devolución Vencida': return 'alarm';
      default: return 'notifications';
    }
  }

  getColorForEstado(estado: string): string {
    switch(estado) {
      case 'Aprobado': return 'success';
      case 'Rechazado': return 'danger';
      case 'Pendiente': return 'warning';
      case 'Devolución Próxima': return 'warning';
      case 'Devolución Vencida': return 'danger';
      default: return 'medium';
    }
  }

  async markAsRead(notification: NotificacionReserva) {
    try {
      this.notificationService.marcarComoLeida(notification._id);
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      await this.showErrorToast('Error al marcar como leída');
    }
  }

  async clearAll() {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: '¿Limpiar todas las notificaciones?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Limpiar',
          handler: async () => {
            await this.deleteAllNotifications();
          }
        }
      ]
    });
    await alert.present();
  }

  private async deleteAllNotifications() {
    try {
      const deletePromises = this.notificaciones
        .filter(n => n.usuarioId === this.currentUser._id)
        .map(n => this.notificationService.eliminarNotificacion(n._id));
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error eliminando notificaciones:', error);
      await this.showErrorToast('Error al limpiar notificaciones');
    }
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  onToastDismiss() {
    this.showToast = false;
  }
}