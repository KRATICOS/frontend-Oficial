import { Component, inject, ViewChild, OnInit } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonItem, IonLabel, IonInput, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonToast
} from '@ionic/angular/standalone';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { qrCode, keypad, closeCircle, search } from 'ionicons/icons';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router';
import { HistorialService } from '../services/historial.service';
import { ServiceService } from '../services/service.service';
import { NotificationService } from '../services/notification.service';
import { ToastController } from '@ionic/angular';
import { lastValueFrom } from 'rxjs';
import { IonSearchbar } from '@ionic/angular/standalone'; 
import {  ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    IonButton, IonInput, IonLabel, IonItem, IonContent,
    ZXingScannerModule, IonHeader, IonToolbar, IonTitle,
    FormsModule, CommonModule, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonIcon
  ],
  providers: [
    InventarioService,
    HistorialService,
    NotificationService
  ]
})
export class Tab1Page implements OnInit {
  @ViewChild(ZXingScannerComponent)
  scanner!: ZXingScannerComponent;
  @ViewChild('searchbar', { static: false }) searchbar!: IonSearchbar; 

    mostrarBusqueda = false; 
  searchTerm = ''; 
  mostrarScanner = false;
  mostrarInput = false;
  Id: string = '';
  usuario: any = null;
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private inventarioServices = inject(InventarioService);
  private historialService = inject(HistorialService);
  private authService = inject(ServiceService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);


  constructor() {
    addIcons({ qrCode, keypad, closeCircle, search });
  }

  async ngOnInit() {
    await this.cargarUsuario();
  }

  private async cargarUsuario() {
    try {
      const usuarioGuardado = localStorage.getItem('User');
      if (usuarioGuardado && usuarioGuardado !== 'undefined') {
        this.usuario = JSON.parse(usuarioGuardado);
      } else {
        await this.mostrarError('Debe iniciar sesión');
      }
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      await this.mostrarError('Error al cargar usuario');
    }
  }
  
  modoEscaneo() {
    this.mostrarScanner = true;
    this.mostrarInput = false;
  }

  modoManual() {
    this.mostrarInput = true;
    this.mostrarScanner = false;
  }

  cerrarScanner() {
    this.mostrarScanner = false;
  }

  async procesarCodigo(codigo: string) {
    this.mostrarScanner = false;
    const inventarioId = this.obtenerIdDeUrl(codigo);
    
    if (!inventarioId || !this.usuario?._id) {
      this.mostrarError('ID inválido o usuario no autenticado');
      return;
    }

    try {
      const equipo = await lastValueFrom(
        this.inventarioServices.EquiposId(inventarioId)
      );
      
      if (!equipo) {
        this.mostrarError('Equipo no encontrado');
        return;
      }

      if (equipo.estado === 'Disponible') {
        await this.registrarPrestamoQR(equipo);
      } else if (equipo.estado === 'Ocupado') {
        await this.registrarDevolucionQR(equipo);
      } else {
        this.mostrarError(`Equipo no disponible (Estado: ${equipo.estado})`);
      }
    } catch (error) {
      console.error('Error:', error);
      this.mostrarError('Error al procesar código QR');
    }
  }

private async registrarPrestamoQR(equipo: any) {
  const horaActual = this.obtenerHoraActual();

  try {
    const registro = await lastValueFrom(
      this.historialService.registrarPrestamoQR({
        inventarioId: equipo._id,
        usuarioId: this.usuario._id,
        horaSolicitud: horaActual,
        tipoPrestamo: 'qr'
      })
    );

    await this.notificationService.agregarNotificacion({
      equipoId: equipo._id,
      equipoNombre: equipo.name,
      usuarioId: this.usuario._id,
      usuarioNombre: this.usuario.name,
      horaInicio: horaActual,
      estado: 'Aprobado',
      tipo: 'qr'
    });

    await lastValueFrom(
      this.inventarioServices.ActualizarEquipos(equipo._id, { 
        estado: 'Ocupado' 
      })
    );

    this.notificationService.notificarCambios();
    this.mostrarExito(`Préstamo QR registrado para ${equipo.name}`);
  } catch (error) {
    console.error('Error registrando préstamo QR:', error);
    this.mostrarError('Error al registrar préstamo');
  }
}

private async registrarDevolucionQR(equipo: any) {
  try {
    const registros = await lastValueFrom(
      this.historialService.materialesEnUso()
    );
    
    const registro = registros?.find((r: any) => {
      const inventarioId = typeof r.inventarioId === 'string' 
        ? r.inventarioId 
        : r.inventarioId._id;
        
      const usuarioRegistro = typeof r.usuarioId === 'string' 
        ? r.usuarioId 
        : r.usuarioId?._id;
        
      return inventarioId === equipo._id && 
             usuarioRegistro === this.usuario._id; 
    });

    if (!registro) {
      this.mostrarError('Este equipo está ocupado por otro usuario');
      return;
    }

      const horaActual = this.obtenerHoraActual();
      
      await lastValueFrom(
        this.historialService.registrarDevolucionQR(registro._id, {
          horaDevolucion: horaActual
        })
      );

      await this.notificationService.agregarNotificacion({
        equipoId: equipo._id,
        equipoNombre: equipo.name,
        usuarioId: this.usuario._id,
        usuarioNombre: this.usuario.name,
        horaInicio: registro.horaSolicitud,
        horaFin: horaActual,
        estado: 'Aprobado',
        tipo: 'qr'
      });

      await lastValueFrom(
        this.inventarioServices.ActualizarEquipos(equipo._id, { 
          estado: 'Disponible' 
        })
      );

      this.mostrarExito(`Devolución QR registrada para ${equipo.name}`);
    } catch (error) {
      console.error('Error registrando devolución QR:', error);
      this.mostrarError('Error al registrar devolución');
    }
  }

  obtenerHoraActual(): string {
    return new Date().toTimeString().slice(0, 5);
  }

  obtenerIdDeUrl(url: string): string | null {
    try {
      return url.split('/').pop() || null;
    } catch (error) {
      return null;
    }
  }

 buscarPorNumero() {
    const input = this.Id.trim();
    if (!input) return;

    const esObjectId = /^[a-f\d]{24}$/i.test(input);

    if (esObjectId) {
      this.inventarioServices.EquiposId(input).subscribe({
        next: (equipo) => {
          if (equipo) {
            this.router.navigate(['/reserva'], { queryParams: { id: equipo._id } });
          } else {
            this.mostrarError('Equipo no encontrado');
          }
        },
        error: () => this.mostrarError('Error buscando equipo por ID')
      });
    } else {
      this.inventarioServices.buscarPorNumeroSerie(input).subscribe({
        next: (equipo) => {
          if (equipo && equipo._id) {
            this.router.navigate(['/reserva'], { queryParams: { id: equipo._id } });
          } else {
            this.mostrarError('Equipo no encontrado por número de serie');
          }
        },
        error: () => this.mostrarError('Error buscando por número de serie')
      });
    }
  }



  buscarPorNumeroSerie() {
    const serie = this.searchTerm.trim();
    if (!serie) return;

    this.inventarioServices.buscarPorNumeroSerie(serie).subscribe({
      next: (equipo) => {
        if (equipo && equipo._id) {
          this.router.navigate(['/reserva'], { queryParams: { id: equipo._id } });
        } else {
          this.mostrarError('Equipo no encontrado');
        }
      },
      error: () => this.mostrarError('Error buscando equipo')
    });
  }


  toggleBusqueda() {
    this.mostrarBusqueda = !this.mostrarBusqueda;
    if (this.mostrarBusqueda) {
      setTimeout(() => this.searchbar.setFocus(), 100);
    }
  }

  private async mostrarExito(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async mostrarError(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}