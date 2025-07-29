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
import { qrCode, keypad, closeCircle, search, alertCircle } from 'ionicons/icons';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router';
import { HistorialService } from '../services/historial.service';
import { ServiceService } from '../services/service.service';
import { NotificationService } from '../services/notification.service';
import { ToastController } from '@ionic/angular';
import { lastValueFrom } from 'rxjs';
import { IonSearchbar } from '@ionic/angular/standalone'; 
import { ActivatedRoute } from '@angular/router';

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
  isProcessing = false; // Bandera para bloquear múltiples operaciones

  private inventarioServices = inject(InventarioService);
  private historialService = inject(HistorialService);
  private authService = inject(ServiceService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);

  constructor() {
    addIcons({ qrCode, keypad, closeCircle, search, alertCircle });
  }

  async ngOnInit() {
    await this.cargarUsuario();
    this.actualizarHorasBloqueadas();
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

  private async notificarCambiosEstado() {
    this.notificationService.notificarCambios();
    await new Promise(resolve => setTimeout(resolve, 500));
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
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    this.mostrarScanner = false;
    const inventarioId = this.obtenerIdDeUrl(codigo);
    
    if (!inventarioId || !this.usuario?._id) {
      this.mostrarError('ID inválido o usuario no autenticado');
      this.isProcessing = false;
      return;
    }

    try {
      const equipo = await lastValueFrom(
        this.inventarioServices.EquiposId(inventarioId)
      );
      
      if (!equipo) {
        this.mostrarError('Equipo no encontrado');
        this.isProcessing = false;
        return;
      }

      if (equipo.estado === 'Disponible') {
        await this.registrarPrestamoQR(equipo);
      } else if (equipo.estado === 'Ocupado') {
        await this.registrarDevolucionQR(equipo);
      } else {
        this.mostrarError(`Equipo no disponible (Estado: ${equipo.estado})`);
      }
      
      await this.notificarCambiosEstado();
    } catch (error) {
      console.error('Error:', error);
      this.mostrarError('Error al procesar código QR');
    } finally {
      this.isProcessing = false;
    }
  }

  private async registrarPrestamoQR(equipo: any) {
    const horaActual = this.obtenerHoraActual();
    const horaActualNumero = this.obtenerHoraActualNumero();

    try {
      // Verificar si el usuario ya tiene un préstamo QR activo
      const tienePrestamoQR = await lastValueFrom(
        this.historialService.tienePrestamoQRActivoParaUsuario(this.usuario._id)
      );

      if (tienePrestamoQR) {
        this.mostrarError('Ya tienes un préstamo QR activo. Devuelve el equipo actual antes de tomar otro.', 'warning');
        return;
      }

      if (equipo.estado !== 'Disponible') {
        this.mostrarError(`El equipo no está disponible (Estado: ${equipo.estado})`);
        return;
      }

      const registro = await lastValueFrom(
        this.historialService.registrarPrestamoQR({
          inventarioId: equipo._id,
          usuarioId: this.usuario._id,
          horaSolicitud: horaActual,
          tipoPrestamo: 'qr',
          horaInicioNumero: horaActualNumero
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
          estado: 'Ocupado',
          ultimoPrestamoQR: horaActualNumero
        })
      );

      this.notificationService.notificarBloqueoHora({
        equipoId: equipo._id,
        hora: horaActualNumero,
        accion: 'bloquear'
      });

      await this.notificarCambiosEstado();
      this.mostrarExito(`Préstamo QR registrado para ${equipo.name}`);
    } catch (error) {
      console.error('Error registrando préstamo QR:', error);
      this.mostrarError('Error al registrar préstamo');
    }
  }

  private async registrarDevolucionQR(equipo: any) {
    try {
      const prestamosQR = await lastValueFrom(
        this.historialService.materialesEnUso()
      );

      const prestamoActivo = prestamosQR.find(p => {
        if (!p.inventarioId || !p.usuarioId) return false;

        const usuarioId = typeof p.usuarioId === 'object' ? p.usuarioId._id : p.usuarioId;
        const inventarioId = typeof p.inventarioId === 'object' ? p.inventarioId._id : p.inventarioId;

        return usuarioId === this.usuario._id && 
               inventarioId === equipo._id && 
               (!p.horaDevolucion || p.horaDevolucion === '' || p.horaDevolucion === null);
      });

      if (!prestamoActivo) {
        this.mostrarError('No se encontró un préstamo activo para este equipo');
        return;
      }

      const horaActual = this.obtenerHoraActual();

      await lastValueFrom(
        this.historialService.registrarDevolucion(prestamoActivo._id, {
          horaDevolucion: horaActual,
          estado: 'Disponible'
        })
      );

      await this.notificationService.agregarNotificacion({
        equipoId: equipo._id,
        equipoNombre: equipo.name,
        usuarioId: this.usuario._id,
        usuarioNombre: this.usuario.name,
        horaInicio: prestamoActivo.horaSolicitud,
        horaFin: horaActual,
        estado: 'Aprobado',
        tipo: 'qr'
      });

      await lastValueFrom(
        this.inventarioServices.ActualizarEquipos(equipo._id, {
          estado: 'Disponible',
          ultimoPrestamoQR: null
        })
      );

      this.notificationService.notificarBloqueoHora({
        equipoId: equipo._id,
        hora: equipo.ultimoPrestamoQR,
        accion: 'desbloquear'
      });

      await this.notificarCambiosEstado();
      this.mostrarExito(`Devolución registrada para ${equipo.name}`);
    } catch (error) {
      console.error('Error registrando devolución:', error);
      this.mostrarError('Error al registrar devolución');
    }
  }

  obtenerHoraActual(): string {
    return new Date().toTimeString().slice(0, 5);
  }

  private obtenerHoraActualNumero(): number {
    return new Date().getHours();
  }

  obtenerIdDeUrl(url: string): string | null {
    try {
      return url.split('/').pop() || null;
    } catch (error) {
      return null;
    }
  }

  buscarPorNumero() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    const input = this.Id.trim();
    if (!input) {
      this.isProcessing = false;
      return;
    }

    const esObjectId = /^[a-f\d]{24}$/i.test(input);

    if (esObjectId) {
      this.inventarioServices.EquiposId(input).subscribe({
        next: (equipo) => {
          if (equipo) {
            this.router.navigate(['/reserva'], { queryParams: { id: equipo._id } });
          } else {
            this.mostrarError('Equipo no encontrado');
          }
          this.isProcessing = false;
        },
        error: () => {
          this.mostrarError('Error buscando equipo por ID');
          this.isProcessing = false;
        }
      });
    } else {
      this.inventarioServices.buscarPorNumeroSerie(input).subscribe({
        next: (equipo) => {
          if (equipo && equipo._id) {
            this.router.navigate(['/reserva'], { queryParams: { id: equipo._id } });
          } else {
            this.mostrarError('Equipo no encontrado por número de serie');
          }
          this.isProcessing = false;
        },
        error: () => {
          this.mostrarError('Error buscando por número de serie');
          this.isProcessing = false;
        }
      });
    }
  }

  async buscarPorNumeroSerie() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    const serie = this.searchTerm.trim();
    if (!serie) {
      this.isProcessing = false;
      return;
    }

    try {
      const equipo = await lastValueFrom(
        this.inventarioServices.buscarPorNumeroSerie(serie)
      );

      if (equipo && equipo._id) {
        await this.procesarEquipoEncontrado(equipo);
      } else {
        this.mostrarError('Equipo no encontrado');
      }
    } catch (error) {
      this.mostrarError('Error buscando equipo');
    } finally {
      this.isProcessing = false;
    }
  }

  async procesarEquipoEncontrado(equipo: any) {
    if (!equipo || !this.usuario?._id) {
      this.mostrarError('Equipo inválido o usuario no autenticado');
      return;
    }

    try {
      if (equipo.estado === 'Disponible') {
        await this.registrarPrestamoQR(equipo);
      } else if (equipo.estado === 'Ocupado') {
        await this.registrarDevolucionQR(equipo);
      } else {
        this.mostrarError(`Equipo no disponible (Estado: ${equipo.estado})`);
      }

      await this.notificarCambiosEstado();
    } catch (error) {
      console.error('Error al procesar equipo:', error);
      this.mostrarError('Error al procesar equipo por número de serie');
    }
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
      position: 'top',
      icon: 'checkmark-circle'
    });
    await toast.present();
  }
  
  private async mostrarError(mensaje: string, tipo: 'error' | 'warning' = 'error') {
    const color = tipo === 'warning' ? 'warning' : 'danger';
    const icon = tipo === 'warning' ? 'alert-circle' : 'close-circle';
    
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top',
      icon: icon
    });
    await toast.present();
  }

  private actualizarHorasBloqueadas() {
    setInterval(() => {
      const horaActual = this.obtenerHoraActualNumero();
      this.notificationService.notificarBloqueoHoraAutomatico({
        horaActual: horaActual
      });
    }, 60000);
  }
}
