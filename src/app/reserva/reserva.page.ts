import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonItem,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonBackButton,
  IonButtons, IonCardSubtitle, IonImg, IonChip, IonTextarea, IonIcon, IonBadge, IonToast
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, lastValueFrom, Subscription,forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { InventarioService } from '../services/inventario.service';
import { HistorialService } from '../services/historial.service';
import { NotificationService, NotificacionReserva } from '../services/notification.service';
import { Inventario, Registro } from '../interface';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-reserva',
  templateUrl: './reserva.page.html',
  styleUrls: ['./reserva.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonTextarea, IonChip, IonIcon, IonCardSubtitle, IonButtons, IonBackButton,
    IonSpinner, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonBadge,
    IonItem, IonLabel, IonButton, IonContent, IonHeader, IonTitle,
    IonToolbar, CommonModule, FormsModule
  ]
})
export class ReservaPage implements OnInit, OnDestroy {
  ID: string | null = null;
  observaciones = '';
  availableHours: number[] = [];
  selectedHours: number[] = [];
  bookedHours: number[] = [];
  approvedHours: number[] = [];
  qrActiveHours: number[] = [];
  isLoading = false;
  equipo: any;
  currentUser: any;
  private refreshSubscription?: Subscription;

  private inventarioService = inject(InventarioService);
  private historialService = inject(HistorialService);
  private notificationService = inject(NotificationService);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.initializePage();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  private setupPage() {
  this.obtenerEquipo(this.ID!);
  this.iniciarMonitorEstado();
  this.generateAvailableHours();
  
  // Escuchar eventos de cambios
  this.notificationService.obtenerCambiosObservable().subscribe(() => {
    this.actualizarDatos();
  });
}

private async initializePage() {
  try {
    // 🔹 Evitar el bloqueo por focus residual al cambiar de interfaz
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    this.currentUser = JSON.parse(localStorage.getItem('User') || 'null');
    if (!this.currentUser) {
      await this.showToast('Debe iniciar sesión', 'danger');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      this.router.navigate(['/tabs/tab1']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      this.ID = params['id'];
      if (!this.ID) {
        this.handleMissingId();
        return;
      }
      console.log('Equipo seleccionado:', this.ID);
      this.setupPage(); // ⚡ Corregido: se llama aquí tras confirmar ID
    });
  } catch (error) {
    console.error('Error inicializando página:', error);
    this.showToast('Error al cargar la página', 'danger');
  }
}

private handleMissingId() {
  console.error('ID no proporcionado');
  this.showToast('Equipo no especificado', 'danger');

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  this.router.navigate(['/tabs/tab1']);
}


private iniciarMonitorEstado(): void {
  this.refreshSubscription = interval(5000).pipe(
    switchMap(() => this.inventarioService.EquiposId(this.ID!)),
    switchMap((equipo: any) => {
      this.equipo = equipo;
      return forkJoin([
        this.historialService.obtenerHistorial(),
        of(this.notificationService.notificacionesActuales)
      ]);
    })
  ).subscribe({
    next: ([historial, notificaciones]) => {
      this.actualizarHorasOcupadas(historial, notificaciones);
    },
    error: (err: any) => console.error('Error monitoreando estado:', err)
  });
}


private actualizarDatos(): void {
  forkJoin([
    this.inventarioService.EquiposId(this.ID!),
    this.historialService.obtenerHistorial()
  ]).subscribe({
    next: ([equipo, historial]) => {
      this.equipo = equipo;
      this.actualizarHorasOcupadas(historial, this.notificationService.notificacionesActuales);
    },
    error: (err: any) => console.error('Error actualizando datos:', err)
  });
}


private actualizarHorasOcupadas(historial: Registro[], notificaciones: NotificacionReserva[]): void {
  this.cargarHorasReservadas(historial);
  this.cargarHorasAprobadas(notificaciones);
  this.cargarHorasQR(historial, notificaciones);
}

  private handleEstadoChange(equipo: any) {
    if (equipo.estado !== this.equipo?.estado) {
      this.equipo.estado = equipo.estado;
      this.updateHours();
      this.showToast(`Estado actualizado: ${equipo.estado}`, 'warning');
    }
  }

private updateHours() {
  forkJoin([
    this.historialService.obtenerHistorial(),
    of(this.notificationService.notificacionesActuales)
  ]).subscribe({
    next: ([historial, notificaciones]) => {
      this.cargarHorasReservadas(historial);
      this.cargarHorasAprobadas(notificaciones);
      this.cargarHorasQR(historial, notificaciones);
    },
    error: err => console.error('Error actualizando horas:', err)
  });
}

  obtenerEquipo(id: string) {
    this.isLoading = true;
    this.inventarioService.EquiposId(id).subscribe({
      next: data => {
        this.equipo = data;
        this.updateHours();
      },
      error: err => {
        console.error('Error al cargar equipo:', err);
        this.showToast('Error al cargar equipo', 'danger');
        this.isLoading = false;
      }
    });
  }

  generateAvailableHours() {
    this.availableHours = Array.from({ length: 13 }, (_, i) => i + 8);
  }

async cargarHorasQR(historial?: Registro[], notificaciones?: NotificacionReserva[]): Promise<void> {
  try {
    // 1. Obtener préstamos QR activos del historial
    const historialData = historial || await lastValueFrom(this.historialService.obtenerHistorial());
    const qrRegistros = historialData.filter((r: Registro) => {
      const inventarioId = typeof r.inventarioId === 'string' ? r.inventarioId : r.inventarioId._id;
      return inventarioId === this.equipo._id && 
             r.tipoPrestamo === 'qr' && 
             r.estado === 'Ocupado';
    });

    // 2. Obtener notificaciones QR activas
    const notificacionesData = notificaciones || this.notificationService.notificacionesActuales;
    const notificacionesQR = notificacionesData
      .filter(n => n.equipoId === this.equipo._id && 
                  n.tipo === 'qr' && 
                  n.estado === 'Aprobado' && 
                  !n.horaFin);

    // Combinar ambas fuentes
    this.qrActiveHours = [
      ...qrRegistros.map(r => parseInt(r.horaSolicitud.split(':')[0], 10)),
      ...notificacionesQR.map(n => parseInt(n.horaInicio.split(':')[0], 10))
    ];
  } catch (e) {
    console.error('Error cargando horas QR:', e);
  }
}

async cargarHorasReservadas(historial?: Registro[]): Promise<void> {
  try {
    const historialData = historial || await lastValueFrom(this.historialService.obtenerHistorial());
    this.bookedHours = historialData
      .filter((r: Registro) => {
        const inventarioId = typeof r.inventarioId === 'string' ? r.inventarioId : r.inventarioId._id;
        return inventarioId === this.equipo._id &&
               (r.estado === 'Ocupado' || r.estado === 'Disponible');
      })
      .map((r: Registro) => {
        const start = parseInt(r.horaSolicitud.split(':')[0], 10);
        const end = parseInt(r.horaDevolucion?.split(':')[0] || `${start + 1}`, 10);
        return Array.from({ length: end - start }, (_, i) => start + i);
      })
      .reduce((acc, val) => acc.concat(val), []);

    const notificacionesQR = this.notificationService.notificacionesActuales
      .filter(n => n.equipoId === this.equipo._id && n.tipo === 'qr' && n.estado === 'Aprobado' && !n.horaFin);

    if (notificacionesQR.length > 0) {
      const horaQR = parseInt(notificacionesQR[0].horaInicio.split(':')[0], 10);
      this.bookedHours.push(horaQR);
    }
  } catch (e) {
    console.error('Error cargando historial:', e);
  } finally {
    this.isLoading = false;
  }
}

async cargarHorasAprobadas(notificaciones?: NotificacionReserva[]): Promise<void> {
  try {
    const notificacionesData = notificaciones || this.notificationService.notificacionesActuales;
    this.approvedHours = notificacionesData
      .filter(n => n.equipoId === this.equipo?._id && n.estado === 'Aprobado')
      .map((n: NotificacionReserva) => {
        if (!n.horaFin) return [];
        const start = parseInt(n.horaInicio.split(':')[0], 10);
        const end = parseInt(n.horaFin.split(':')[0], 10);
        return Array.from({ length: end - start }, (_, i) => start + i);
      })
      .reduce((acc, val) => acc.concat(val), []);
  } catch (e) {
    console.error('Error cargando horas aprobadas:', e);
  }
}
  toggleHourSelection(hour: number) {
    if (this.isHourBooked(hour)) {
      this.showToast('Esta hora ya está reservada', 'warning');
      return;
    }
    if (this.isHourApproved(hour)) {
      this.showToast('Esta hora ya ha sido reservada por otro usuario', 'danger');
      return;
    }
    if (this.isHourQR(hour)) {
      this.showToast('Esta hora está ocupada por un préstamo QR', 'warning');
      return;
    }
    const idx = this.selectedHours.indexOf(hour);
    idx > -1 ? this.selectedHours.splice(idx, 1) : this.selectedHours.push(hour);
    this.selectedHours.sort((a, b) => a - b);
  }

  isHourQR(hour: number): boolean {
    return this.qrActiveHours.includes(hour);
  }

  limpiarSeleccion() {
    this.selectedHours = [];
  }

  isHourBooked(hour: number): boolean {
    return this.bookedHours.includes(hour);
  }

  isHourApproved(hour: number): boolean {
    return this.approvedHours.includes(hour);
  }

  isHourSelected(hour: number): boolean {
    return this.selectedHours.includes(hour);
  }

  get canReserve(): boolean {
    return this.selectedHours.length > 0 &&
           !this.hasBookedHours &&
           !this.hasApprovedHours &&
           !this.hasQRHours;
  }

  get hasBookedHours(): boolean {
    return this.selectedHours.some(h => this.bookedHours.includes(h));
  }

  get hasApprovedHours(): boolean {
    return this.selectedHours.some(h => this.approvedHours.includes(h));
  }

  get hasQRHours(): boolean {
    return this.selectedHours.some(h => this.qrActiveHours.includes(h));
  }

  getSelectedHoursText(): string {
    if (this.selectedHours.length === 0) return '';
    const start = this.selectedHours[0];
    const end = this.selectedHours[this.selectedHours.length - 1] + 1;
    return `${start}:00 - ${end}:00`;
  }

  getHourColor(hour: number): string {
    if (this.isHourBooked(hour) || this.isHourApproved(hour)) return 'danger';
    if (this.isHourQR(hour)) return 'tertiary';
    if (this.isHourSelected(hour)) return 'primary';
    return 'success';
  }

  getHourStatus(hour: number): string {
    if (this.isHourBooked(hour)) return 'Ocupado';
    if (this.isHourApproved(hour)) return 'Reservado';
    if (this.isHourQR(hour)) return 'QR Activo';
    return 'Disponible';
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Ocupado': return 'danger';
      case 'Pendiente': return 'warning';
      default: return 'medium';
    }
  }

  async registrarPrestamo() {
    if (!this.canReserve) {
      this.showToast('No se puede realizar la reserva', 'danger');
      return;
    }

    if (!this.currentUser?._id) {
      this.showToast('Debes iniciar sesión', 'danger');
      return;
    }

    const start = `${this.selectedHours[0]}:00`;
    const end = `${this.selectedHours[this.selectedHours.length - 1] + 1}:00`;

    try {
      await this.notificationService.agregarNotificacion({
        equipoId: this.equipo._id,
        equipoNombre: this.equipo.name,
        usuarioId: this.currentUser._id,
        usuarioNombre: this.currentUser.name,
        horaInicio: start,
        horaFin: end,
        observaciones: this.observaciones,
        estado: 'Pendiente',
        tipo: 'reserva'
      });

      this.showToast('Solicitud de reserva enviada', 'success');
      this.router.navigate(['/tabs/tab2']);
    } catch (error) {
      this.showToast('Error al enviar solicitud', 'danger');
      console.error('Error registrando préstamo:', error);
    }
  }

  private async showToast(msg: string, color: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}