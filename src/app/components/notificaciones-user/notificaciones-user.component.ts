import { Component, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonBadge, IonAvatar, IonButton, IonIcon, IonToast, 
  IonAlert, AlertController, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, time, notifications, notificationsOff, alarm, trash } from 'ionicons/icons';
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
    addIcons({trash,notificationsOff,checkmarkCircle,closeCircle,time,notifications,alarm});
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
      !n.leida && (n.estado === 'Aprobado' || n.estado === 'Rechazado'
)
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
  // Notificación de tiempo restante (3 minutos)
  if (notification.extra?.type === 'devolucion-proxima') {
    return { 
      title: 'Devolución Próxima',
      body: `Tienes ${notification.extra.minutosRestantes} minutos para devolver ${notification.equipoNombre}`
    };
  }

  // Notificación de tiempo vencido
  if (notification.extra?.type === 'devolucion-vencida') {
    return { 
      title: 'Devolución Vencida',
      body: `La devolución de ${notification.equipoNombre} está vencida por ${notification.extra.minutosVencidos} minutos`
    };
  }

  // Handle other notification types
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
    case 'Pendiente':
      return notification.tipo === 'qr'
        ? { 
            title: 'Préstamo QR Registrado', 
            body: `Has tomado ${notification.equipoNombre} correctamente` 
          }
        : { 
            title: 'Solicitud de Reserva', 
            body: `Tu solicitud para ${notification.equipoNombre} está en revisión` 
          };
    default:
      return { 
        title: 'Nueva notificación', 
        body: 'Tienes una nueva notificación' 
      };
  }
}

  private showToastMessage(message: string, estado: string) {
    this.toastMessage = message;
    this.toastColor = this.getColorForEstado(estado);
    this.showToast = true;
  }

  
  private setupPushListeners() {
  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const notificationId = notification.notification.extra?.notificationId;
      if (notificationId) {
        this.notificationService.marcarComoLeida(notificationId);
        
        // Manejar acciones específicas para notificaciones de devolución
        const type = notification.notification.extra?.type;
        if (type === 'devolucion-vencida') {
          // Podrías navegar a una pantalla de devolución o mostrar un mensaje
          this.showToastMessage('¡Por favor devuelve el equipo inmediatamente!', 'danger');
        }
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

async deleteNotification(notification: NotificacionReserva, event: Event) {
  event.stopPropagation(); // Evitar que el clic active el markAsRead

  const alert = await this.alertController.create({
    header: 'Confirmar',
    message: '¿Deseas eliminar esta notificación?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        handler: async () => {
          try {
            await this.notificationService.eliminarNotificacion(notification._id);
            // Recarga las notificaciones para actualizar la vista
            this.loadNotifications();
            this.showToastMessage('Notificación eliminada', 'success');
          } catch (error) {
            console.error('Error eliminando notificación:', error);
            await this.showErrorToast('No se pudo eliminar la notificación');
          }
        }
      }
    ]
  });

  await alert.present();
}

async showErrorToast(message: string) {
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