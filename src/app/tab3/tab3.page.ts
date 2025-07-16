import { Component, inject } from '@angular/core';
import { IonHeader,IonThumbnail, IonToolbar, IonTitle, IonContent, IonCardHeader, IonCardTitle, IonCardContent, IonCard, IonButton, IonAvatar, IonLabel, IonItem, IonListHeader, IonList, IonCardSubtitle, IonButtons, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { ServiceService } from '../services/service.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Usuario } from '../interface';
import { ModalController } from '@ionic/angular/standalone';
import { NotificacionesAdminComponent } from '../components/notificaciones-admin/notificaciones-admin.component';
import { HistorialService } from '../services/historial.service';
import { Registro } from '../interface';

import { NotificationService, NotificacionReserva } from '../services/notification.service';
import { NotificacionesUserComponent } from '../components/notificaciones-user/notificaciones-user.component';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, construct } from 'ionicons/icons';
import { notificationsOutline } from 'ionicons/icons';

import {
  mailOutline,
  callOutline,
  idCardOutline,
  peopleOutline,
  personOutline,
  createOutline,
  logOutOutline,
  arrowForwardOutline
} from 'ionicons/icons';
addIcons({
  checkmarkCircle,
  closeCircle,
  construct,
  notificationsOutline,
    callOutline,
    mailOutline,
  idCardOutline,
  peopleOutline,
  personOutline,
  createOutline,
  logOutOutline,
  arrowForwardOutline // nuevo ícono agregado
});


@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonBadge, IonIcon, IonButtons,  IonButton, IonCard, IonCardContent, IonCardTitle, IonCardHeader, IonHeader, IonToolbar, IonTitle, IonContent, FormsModule, CommonModule, IonAvatar,IonCardSubtitle],
})
export class Tab3Page {
  usuario: any;
    notificaciones: NotificacionReserva[] = [];
  mostrarNotificaciones = false;

  constructor() { }

  private _serviceServices = inject(ServiceService);
  private router = inject(Router);
    private notificationService = inject(NotificationService);
    private _historialService = inject(HistorialService);
    private _router = inject(Router);
    private modalCtrl = inject(ModalController);

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

    async abrirModalNotificaciones() {
      const modal = await this.modalCtrl.create({
        component: NotificacionesUserComponent,
        componentProps: {
          notificaciones: this.notificaciones
        },
        breakpoints: [0, 0.5, 0.8],
        initialBreakpoint: 0.8
      });
      
      modal.onDidDismiss().then((data) => {
        if (data?.data) {
          // Manejar datos devueltos del modal si es necesario
        }
      });
  
      await modal.present();
    }

  ngOnInit() {

    const usuarioGuardado = localStorage.getItem('User');

    if (usuarioGuardado && usuarioGuardado !== 'undefined') {
      this.usuario = JSON.parse(usuarioGuardado);
    } else {
      console.warn('No se encontró información del usuario en localStorage.');
      this.usuario = { nombre: '', correo: '', imagenes:[]};
    }
  }





  actualizarPerfil() {
    console.log('Actualizar perfil presionado');
    this.router.navigate(['/editperfil']);
  }

  logout() {
    console.log('Cerrar sesión presionado');
    // Limpia el token y usuario
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // Redirige al login
    this.router.navigate(['/login']);
  }




}
