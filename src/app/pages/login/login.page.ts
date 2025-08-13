import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonText,
  IonInput,
  IonCard,
  IonCardHeader,
  IonAvatar,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { Usuario } from 'src/app/interface';

import { addIcons } from 'ionicons';
import {  eyeOutline } from 'ionicons/icons';

    addIcons({eyeOutline});
  


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonCardContent,
    IonCardSubtitle,
    IonCardTitle,
    IonAvatar,
    IonCardHeader,
    IonCard,
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonButton,
    IonInput,
    IonLabel,
    RouterModule,
    IonText
  ]
})
export class LoginPage implements OnInit, OnDestroy {

  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  passwordFieldType: string = 'password';

  currentImage: number = 0;
  currentTime: string = ''; // ⏰ nueva propiedad para la hora
  private intervalId: any;

  private authService = inject(ServiceService);
  private router = inject(Router);

  constructor() {}

  User: Usuario[] = [];

  ngOnInit() {

  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.passwordFieldType = this.showPassword ? 'text' : 'password';
  }

  slideOpts = {
    initialSlide: 0,
    speed: 1000,
    autoplay: {
      delay: 5000,
    },
    loop: true,
    effect: 'fade',
    fadeEffect: {
      crossFade: true
    }
  };

  carouselImages: string[] = [
    'assets/KITSdeherramientas.png',
    'assets/multimetros.png',
    'assets/proyector1.png',
    'assets/festo.jpg',
    'assets/fuenteV.png'
  ];

  onLogin() {
    if (!this.email || !this.password) {
      console.log('Correo y contraseña son requeridos');
      return;
    }

    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          console.log('Login exitoso', response);
          localStorage.setItem('token', response.token);
          localStorage.setItem('User', JSON.stringify(response.usuario));

          const rol = response.usuario.rol;
          if (rol === 'admin' || rol === 'superadmin') {
            this.router.navigate(['/tabs-Admin/tab5']);
          } else {
            this.router.navigate(['/tabs/tab3']);
          }
        },
        error: (err) => {
          console.error('Error al iniciar sesión:', err);
        }
      });
  }
}
