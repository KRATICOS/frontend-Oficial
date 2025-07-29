import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCardContent, IonCardTitle,
  IonCardHeader, IonCard, IonButton, IonAvatar, IonButtons, IonIcon,
  IonCardSubtitle, IonBadge, IonList, IonItem, IonLabel
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { NotificacionesAdminComponent } from '../components/notificaciones-admin/notificaciones-admin.component';
import { ServiceService } from '../services/service.service';
import { HistorialService } from '../services/historial.service';
import { Registro } from '../interface';
import { Router } from '@angular/router';
import { NotificationService, NotificacionReserva } from '../services/notification.service';
import { addIcons } from 'ionicons';

import {
  checkmarkCircle,
  closeCircle,
  construct,
  notificationsOutline,
  mailOutline,
  logOutOutline,
  arrowForwardOutline,
  createOutline,
} from 'ionicons/icons';

  addIcons({
    'checkmark-circle':   checkmarkCircle,
    'close-circle':       closeCircle,
    'construct-outline':  construct,
    'notifications-outline': notificationsOutline,
    'mail-outline':       mailOutline,
    'log-out-outline':    logOutOutline,
    'arrow-forward-outline': arrowForwardOutline,
    'create-outline':     createOutline,
  });



@Component({
  selector: 'app-tab5-admin',
  templateUrl: './tab5-admin.page.html',
  styleUrls: ['./tab5-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
    IonButton, IonAvatar, IonButtons, IonIcon, IonBadge
  ]
})
export class Tab5AdminPage implements OnInit {
  usuario: any;
  notificaciones: NotificacionReserva[] = [];

  private _serviceService = inject(ServiceService);
  private notificationService = inject(NotificationService);
  private _historialService = inject(HistorialService);
  private _router = inject(Router);
  private modalCtrl = inject(ModalController);

async ngOnInit(): Promise<void> {
  const userLS = localStorage.getItem('User');
  this.usuario = userLS && userLS !== 'undefined'
    ? JSON.parse(userLS)
    : { name: '', email: '', imagenes: [] };

  this.usuario.imagenUrl = this.getImagenPerfil(this.usuario); // <-- esta línea es clave

  this.subscribirNotificaciones();
}


  subscribirNotificaciones(): void {
    this.notificationService.notificaciones$.subscribe({
      next: (nots) => {
        this.notificaciones = nots.filter(n => n.estado === 'Pendiente');
        console.log('Notificaciones pendientes:', this.notificaciones.length);
      },
      error: (err) => console.error('Error en notificaciones:', err)
    });
  }

  async abrirModalNotificaciones() {
    const modal = await this.modalCtrl.create({
      component: NotificacionesAdminComponent,
      componentProps: {
        notificaciones: this.notificaciones
      },
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8
    });
    
    modal.onDidDismiss().then((data) => {
      if (data?.data) {
      }
    });

    await modal.present();
  }
  getImagenPerfil(usuario: any): string {
  if (
    usuario.imagenes &&
    Array.isArray(usuario.imagenes) &&
    usuario.imagenes.length > 0 &&
    usuario.imagenes[0].url
  ) {
    const imagen = usuario.imagenes[0].url;

    if (imagen.startsWith('http')) {
      return imagen;
    }

    return `http://localhost:3001/${imagen}`; 
  }

  return 'assets/utvcoIMAGEN.jpg';
}


onImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  target.src = 'assets/utvcoIMAGEN.jpg';
}

  actualizarPerfil(): void {
    this._router.navigate(['/editperfil']);
  }

    addAdm(): void {
    this._router.navigate(['/addAdmin']);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('User');
    this._router.navigate(['/login']);
  }
}