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
      
      await this.notificarCambiosEstado();
    } catch (error) {
      console.error('Error:', error);
      this.mostrarError('Error al procesar código QR');
    }
  }

private async registrarPrestamoQR(equipo: any) {
  const horaActual = this.obtenerHoraActual();
  const horaActualNumero = this.obtenerHoraActualNumero();

  try {
    // Verificar si el usuario ya tiene un préstamo QR activo para este equipo
    const tienePrestamo = await lastValueFrom(
      this.historialService.tienePrestamoQRActivo(equipo._id, this.usuario._id)
    );

    if (tienePrestamo) {
      this.mostrarError('Ya tienes un préstamo QR activo para este equipo');
      return;
    }

    // Verificar si el equipo está disponible
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

    console.log('🚀 Prestamos activos recibidos:', prestamosQR);
    console.log('👤 Usuario actual:', this.usuario?._id);
    console.log('🧩 Equipo escaneado:', equipo?._id);

    const prestamoActivo = prestamosQR.find(p => {
      // Ignorar registros corruptos
      if (!p.inventarioId || !p.usuarioId) return false;

      const usuarioId = typeof p.usuarioId === 'object' ? p.usuarioId._id : p.usuarioId;
      const inventarioId = typeof p.inventarioId === 'object' ? p.inventarioId._id : p.inventarioId;

      const esMismoUsuario = usuarioId === this.usuario._id;
      const esMismoEquipo = inventarioId === equipo._id;
      const noDevuelto = !p.horaDevolucion || p.horaDevolucion === '' || p.horaDevolucion === null;

      console.log(`🧪 Evaluando préstamo: usuarioId=${usuarioId}, inventarioId=${inventarioId}, esMismoUsuario=${esMismoUsuario}, esMismoEquipo=${esMismoEquipo}, noDevuelto=${noDevuelto}`);

      return esMismoUsuario && esMismoEquipo && noDevuelto;
    });

    if (!prestamoActivo) {
      this.mostrarError('No se encontró un préstamo activo para este equipo o el préstamo está mal formado.');
      return;
    }

    const horaActual = this.obtenerHoraActual();

await lastValueFrom(
  this.historialService.registrarDevolucion(prestamoActivo._id, {
    horaDevolucion: horaActual, // ✅ Se añade horaFin como lo exige el backend
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

    await this.notificarCambiosEstado();

    this.mostrarExito(`Devolución registrada para ${equipo.name}`);
  } catch (error) {
    console.error('❌ Error registrando devolución:', error);
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