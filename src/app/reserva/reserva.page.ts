import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonLabel, IonItem,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonBackButton,
  IonButtons, IonCardSubtitle, IonImg, IonChip, IonTextarea, IonIcon, IonBadge, IonToast,
  IonDatetime, IonDatetimeButton, IonModal, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, lastValueFrom, Subscription, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { calendar, time, checkmark, close, notifications, qrCode, lockClosed, returnDownBack, warning, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { InventarioService } from '../services/inventario.service';
import { HistorialService } from '../services/historial.service';
import { NotificationService, NotificacionReserva } from '../services/notification.service';
import { Inventario, Registro } from '../interface';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core'; 





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
    IonToolbar, CommonModule, FormsModule, IonDatetime, IonDatetimeButton,
    IonModal, IonSelect, IonSelectOption
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
  mostrarBotonDevolucion = true;
  prestamoActivo: any = null;
  horaActual: number = new Date().getHours();
  fechaHoy: string = new Date().toISOString().split('T')[0];
  reservaBloqueada = false;
  selectedDate: string = new Date().toISOString();
  minDate: string = new Date().toISOString();
  maxDate: string = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString();
  durationOptions = [1, 2, 3, 4, 6, 8];
  selectedDuration = 1;
  selectedRegistro: Registro | null = null; 
   isAdmin: boolean = false; 

  
  private bloqueoHorasQR: {[hora: number]: boolean} = {};
  private refreshSubscription?: Subscription;
  private bloqueoSubscription?: Subscription;

  private inventarioService = inject(InventarioService);
  private historialService = inject(HistorialService);
  private notificationService = inject(NotificationService);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor( private cdr: ChangeDetectorRef,) {
    addIcons({qrCode,alertCircle,checkmarkCircle,warning,returnDownBack,calendar,time,checkmark,close,notifications,lockClosed});
  }

private verificarPrestamoActivo(historial: Registro[]) {
  console.log('Verificando préstamo...');
  this.prestamoActivo = historial.find((registro) => {
    const inventarioId = typeof registro.inventarioId === 'object'
      ? registro.inventarioId._id
      : registro.inventarioId;

    const usuarioIdHistorial = typeof registro.usuarioId === 'object'
      ? registro.usuarioId._id
      : registro.usuarioId;

    const condicion = inventarioId === this.equipo._id &&
                      usuarioIdHistorial === this.currentUser._id &&
                      !registro.horaDevolucion;

    if (condicion) {
      console.log('Préstamo encontrado:', registro);
    }
    return condicion;
  });

  if (!this.prestamoActivo) {
    console.log('No se encontró préstamo activo para este usuario y equipo.');
  }
}


  ngOnInit() {
    
    this.initializePage();
    this.iniciarMonitorHoraActual();
    this.cargarPrestamoActivo();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    this.bloqueoSubscription?.unsubscribe();
  }

  private async initializePage() {
    try {
      this.currentUser = JSON.parse(localStorage.getItem('User') || 'null');
      if (!this.currentUser) {
        await this.showToast('Debe iniciar sesión', 'danger');
        this.router.navigate(['/tabs/tab1']);
        return;
      }

      this.route.queryParams.subscribe(params => {
        this.ID = params['id'];
        if (!this.ID) {
          this.handleMissingId();
          return;
        }
        this.setupPage();
      });
    } catch (error) {
      console.error('Error inicializando página:', error);
      this.showToast('Error al cargar la página', 'danger');
    }
  }

  private setupPage() {
    this.obtenerEquipo(this.ID!);
    this.iniciarMonitorEstado();
    this.generateAvailableHours();
    this.notificationService.obtenerCambiosObservable().subscribe(() => {
      this.actualizarDatos();
    });
  }

  private async handleMissingId() {
    console.error('ID no proporcionado');
    await this.showToast('Equipo no especificado', 'danger');
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
  this.verificarPrestamoActivo(historial);
  this.actualizarHorasOcupadas(historial, this.notificationService.notificacionesActuales);

  // 🔁 Recalcular visibilidad del botón de devolución
  this.mostrarBotonDevolucion = !!this.prestamoActivo && this.prestamoActivo.usuarioId === this.currentUser?._id;

  this.cdr.detectChanges(); 
},
      error: (err: any) => console.error('Error actualizando datos:', err)
    });
  }

  private actualizarHorasOcupadas(historial: Registro[], notificaciones: NotificacionReserva[]): void {
    this.cargarHorasReservadas(historial);
    this.cargarHorasAprobadas(notificaciones);
    this.cargarHorasQR(historial, notificaciones);
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
      next: (data: Inventario) => {
        this.equipo = data;
        
        // Verificar estado de bloqueo desde múltiples fuentes
        const equiposBloqueadosStr = localStorage.getItem('equiposBloqueados');
        const equiposBloqueados: Record<string, boolean> = equiposBloqueadosStr ? JSON.parse(equiposBloqueadosStr) : {};
        
        this.reservaBloqueada = id in equiposBloqueados 
          ? equiposBloqueados[id] 
          : data.reservaBloqueada || false;
        
        this.updateHours();
      },
      error: err => {
        console.error('Error al cargar equipo:', err);
        this.showToast('Error al cargar equipo', 'danger');
        this.isLoading = false;
      }
    });
  }


  async cargarHorasQR(historial?: Registro[], notificaciones?: NotificacionReserva[]): Promise<void> {
    try {
      if (!this.selectedDate) return;

      const historialData = historial || await lastValueFrom(this.historialService.obtenerHistorial());
      const qrRegistros = historialData.filter((r: Registro) => {
        if (!r.inventarioId || r.tipoPrestamo !== 'qr' || !r.fecha || !this.isSameDate(r.fecha, this.selectedDate)) {
          return false;
        }

        const inventarioId = typeof r.inventarioId === 'string' ? r.inventarioId : r.inventarioId._id;
        return inventarioId === this.equipo._id && !r.horaDevolucion;
      });

      const notificacionesData = notificaciones || this.notificationService.notificacionesActuales;
      const notificacionesQR = notificacionesData.filter(n =>
        n.equipoId === this.equipo._id &&
        n.tipo === 'qr' &&
        n.estado === 'Aprobado' &&
        !n.horaFin &&
        n.fecha &&
        this.isSameDate(n.fecha, this.selectedDate)
      );

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
          if (!r.inventarioId) return false;
          
          const inventarioId = typeof r.inventarioId === 'string' ? r.inventarioId : r.inventarioId._id;
          
          return inventarioId === this.equipo._id &&
                 r.fecha &&
                 this.isSameDate(r.fecha, this.selectedDate) &&
                 (r.estado === 'Ocupado' || r.estado === 'Disponible');
        })
        .map((r: Registro) => {
          const start = parseInt(r.horaSolicitud.split(':')[0], 10);
          const end = parseInt(r.horaDevolucion?.split(':')[0] || `${start + 1}`, 10);
          return Array.from({ length: end - start }, (_, i) => start + i);
        })
        .reduce((acc, val) => acc.concat(val), []);

      const notificacionesQR = this.notificationService.notificacionesActuales
        .filter(n => 
          n.equipoId === this.equipo._id && 
          n.tipo === 'qr' && 
          n.estado === 'Aprobado' && 
          !n.horaFin &&
          this.isSameDate(n.fecha, this.selectedDate)
        );

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
        .filter(n => 
          n.equipoId === this.equipo?._id &&
          this.isSameDate(n.fecha, this.selectedDate) &&
          n.estado === 'Aprobado'
        )
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onDateChange(event: any) {
    this.selectedDate = event.detail.value;
    this.updateHours();
    this.limpiarSeleccion();
  }

  onDurationChange(event: any) {
    this.selectedDuration = event.detail.value;
    this.limpiarSeleccion();
  }

  isSameDate(date1: string | Date, date2: string | Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  }

  selectTimeRange(startHour: number) {
    this.selectedHours = [];
    for (let i = 0; i < this.selectedDuration; i++) {
      const hour = startHour + i;
      
      if (hour < 1 || hour >= 24) {
        this.showToast('Solo se permiten reservas entre 7:00 y 18:00', 'warning');
        this.selectedHours = [];
        return;
      }
      
      if (this.isHourDisabled(hour)) {
        this.showToast('Una de las horas seleccionadas no está disponible', 'warning');
        this.selectedHours = [];
        return;
      }
      
      this.selectedHours.push(hour);
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

isHourDisabled(hour: number): boolean {
  const now = new Date();
  const selectedDateObj = new Date(this.selectedDate);
  const selectedDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  //  Rango escolar permitido: de 7:00 a 18:00 (es decir, horas 7 a 17 inclusive)
  if (hour < 7 || hour > 18) {
    return true; // Bloquea fuera del horario escolar
  }

  // Si el equipo está en mantenimiento, deshabilita todas las horas
  if (this.equipo?.estado === 'En Mantenimiento') {
    return true;
  }

  // Si es un día anterior al actual, deshabilita
  if (selectedDay < today) {
    return true;
  }

  // Si es el día actual, bloquea horas pasadas
  if (selectedDay.getTime() === today.getTime() && hour < now.getHours()) {
    return true;
  }

  // Deshabilitar si está reservada, aprobada o es QR
  if (this.isHourQR(hour) || this.isHourBooked(hour) || this.isHourApproved(hour)) {
    return true;
  }

  return false;
}

generateAvailableHours() {
  // Genera horas del 7 (7:00 AM) al 20 (8:00 PM)
  this.availableHours = Array.from({ length: 14 }, (_, i) => i + 7);
}


  isHourAvailable(hour: number): boolean {
    return !this.isHourDisabled(hour);
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

  private iniciarMonitorHoraActual() {
    interval(60000).subscribe(() => {
      this.horaActual = new Date().getHours();
      this.verificarHorasPasadas();
    });
  }

  private verificarHorasPasadas() {
    this.availableHours.forEach(hora => {
      if (hora < this.horaActual) {
        this.bloqueoHorasQR[hora] = true;
      }
    });
  }


get canReserve(): boolean {
  return !this.reservaBloqueada && 
         this.selectedHours.length > 0 &&
         !this.hasBookedHours &&
         !this.hasApprovedHours &&
         !this.hasQRHours &&
         !this.hasPastHours;
}

  get puedeDevolver(): boolean {
  return !!this.prestamoActivo && this.prestamoActivo.usuarioId === this.currentUser?._id;
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

  get estadoEquipo(): string {
  return this.equipo?.estado || 'Cargando...';
}

  get hasPastHours(): boolean {
    const now = new Date();
    const selectedDateObj = new Date(this.selectedDate);
    const selectedDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (selectedDay.getTime() === today.getTime()) {
      return this.selectedHours.some(h => h < now.getHours());
    }
    return false;
  }

  getSelectedHoursText(): string {
    if (this.selectedHours.length === 0) return '';
    const start = this.selectedHours[0];
    const end = this.selectedHours[this.selectedHours.length - 1] + 1;
    return `${start}:00 - ${end}:00`;
  }

  getHourIcon(hour: number): string {
    if (this.isHourDisabled(hour)) {
      if (this.isHourQR(hour)) return 'qr-code';
      if (this.isHourBooked(hour)) return 'close-circle';
      if (this.isHourApproved(hour)) return 'time';
      if (hour < this.horaActual) return 'lock-closed';
    }
    return this.isHourSelected(hour) ? 'checkmark-circle' : 'time';
  }

  getHourColor(hour: number): string {
    if (this.isHourBooked(hour) || this.isHourApproved(hour)) return 'danger';
    if (this.isHourQR(hour)) return 'tertiary';
    if (this.isHourSelected(hour)) return 'primary';
    if (hour < this.horaActual) return 'medium';
    return 'success';
  }

  getHourStatus(hour: number): string {
    if (this.isHourQR(hour)) return 'QR Activo';
    if (this.isHourBooked(hour)) return 'Ocupado';
    if (this.isHourApproved(hour)) return 'Reservado';
    if (hour < this.horaActual) return 'Pasada';
    return 'Disponible';
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Ocupado': return 'warning';
      case 'En Mantenimiento': return 'danger';
      default: return 'medium';
    }
  }

  async registrarPrestamo() {
    if (!this.canReserve) {
      this.showToast('No se puede realizar la reserva', 'danger');
      return;
    }

    if (this.equipo?.estado === 'En Mantenimiento') {
  this.showToast('Este equipo está en mantenimiento y no se puede reservar.', 'warning');
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

    HHH(){
    this.router.navigate(['/tabs/tab1']);
  }

    getNombreUsuario(registro: Registro): string {
    if (!registro.usuarioId) return 'No disponible';
    return typeof registro.usuarioId === 'string' 
      ? 'Cargando...' 
      : registro.usuarioId.name || 'No disponible';
  }

  getGrupoUsuario(registro: Registro): string {
    if (!registro.usuarioId) return 'No disponible';
    return typeof registro.usuarioId === 'string' 
      ? 'Cargando...' 
      : registro.usuarioId.grupo || 'No disponible';
  }


  cargarPrestamoActivo() {
  this.historialService.materialesEnUso().subscribe({
    next: (registros: Registro[]) => {
      const equipoId = typeof this.equipo._id === 'string' ? this.equipo._id : this.equipo?._id;
      const prestamosEquipo = registros.filter(registro => {
        const invId = typeof registro.inventarioId === 'string' 
          ? registro.inventarioId 
          : registro.inventarioId?._id;
        const esActivo = !registro.horaDevolucion && 
                         (registro.estado === 'Ocupado' || 
                          (registro.inventarioId && typeof registro.inventarioId !== 'string' &&
                           registro.inventarioId.estado === 'Ocupado'));
        return invId === equipoId && esActivo;
      });

      if (prestamosEquipo.length > 0) {
        this.selectedRegistro = prestamosEquipo[0];
      } else {
        this.selectedRegistro = null;
      }
    },
    error: (err) => {
      console.error('Error cargando préstamo activo:', err);
    }
  });
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