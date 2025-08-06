import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonItem,
  IonButton, IonModal, IonList, IonInput, IonRow, IonCol, IonGrid,
  IonText, IonButtons, IonCard, IonBadge, IonListHeader, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { HistorialService } from '../services/historial.service';
import { Registro, Usuario, Inventario } from '../interface';
import { ServiceService } from '../services/service.service';
import { InventarioService } from '../services/inventario.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-tab-admin',
  templateUrl: './tab-admin.page.html',
  styleUrls: ['./tab-admin.page.scss'],
  standalone: true,
  imports: [IonIcon, IonSpinner, 
    IonBadge, IonListHeader,
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonLabel, IonItem, IonButton, IonModal, IonList, IonText, IonButtons,
  ],
  providers: [DatePipe]
})
export class TabAdminPage implements OnInit {
  private historialService = inject(HistorialService);
  private usuarioService = inject(ServiceService);
  private inventarioService = inject(InventarioService);
  private datePipe = inject(DatePipe);

  registros: Registro[] = [];
  selectedRegistro: Registro | null = null;
  selectedUsuario: Usuario | null = null;
  selectedInventario: Inventario | null = null;
  isLoading: boolean = true;

  ngOnInit() {
    this.obtenerMaterialUso();
  }

  obtenerMaterialUso() {
    this.isLoading = true;
    this.historialService.materialesEnUso().subscribe({
      next: (res: Registro[]) => {
        this.registros = this.filtrarRegistrosUnicos(res);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al obtener registros:', err);
        this.isLoading = false;
      }
    });
  }

private filtrarRegistrosUnicos(registros: Registro[]): Registro[] {
  if (!registros || registros.length === 0) return [];

  const materialesUnicos = new Map<string, Registro>();
  
  // Ordenar por fecha más reciente primero
  const registrosOrdenados = [...registros].sort((a, b) => {
    const fechaA = a.fechaPrestamo ? new Date(a.fechaPrestamo).getTime() : 0;
    const fechaB = b.fechaPrestamo ? new Date(b.fechaPrestamo).getTime() : 0;
    return fechaB - fechaA;
  });

  registrosOrdenados.forEach(registro => {
    if (!registro) return;

    const inventarioId = typeof registro.inventarioId === 'string' 
      ? registro.inventarioId 
      : registro.inventarioId?._id;
    
    // Validar que sea un registro activo de material ocupado
    if (inventarioId && !materialesUnicos.has(inventarioId)) {
      const esActivo = !registro.horaDevolucion && 
                      (registro.estado === 'Ocupado' || 
                      (registro.inventarioId && typeof registro.inventarioId !== 'string' && 
                       registro.inventarioId.estado === 'Ocupado'));
      
      if (esActivo) {
        materialesUnicos.set(inventarioId, registro);
      }
    }
  });
  
  return Array.from(materialesUnicos.values());
}

  async verDetalles(registro: Registro) {
    try {
      this.selectedRegistro = registro;
      this.selectedUsuario = null;
      this.selectedInventario = null;

      const usuarioId = (registro.usuarioId as Usuario)?._id || (registro.usuarioId as string);
      const inventarioId = (registro.inventarioId as Inventario)?._id || (registro.inventarioId as string);

      if (usuarioId) {
        this.selectedUsuario = await this.usuarioService.getUserById(usuarioId).toPromise() ?? null;
      }

      if (inventarioId) {
        this.selectedInventario = await this.inventarioService.EquiposId(inventarioId).toPromise() ?? null;
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
  }

  getCodigo(registro: Registro): string {
    if (!registro.inventarioId) return 'Sin código';
    return typeof registro.inventarioId === 'string' 
      ? 'Cargando...' 
      : registro.inventarioId.nseries || 'Sin código';
  }

  getEstadoBadgeColor(estado: string | undefined): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Ocupado': return 'warning';
      case 'En Mantenimiento': return 'danger';
      default: return 'medium';
    }
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

  formatFecha(fecha: string | Date | undefined): string {
    if (!fecha) return 'Sin fecha';
    return this.datePipe.transform(fecha, 'mediumDate') || 'Fecha inválida';
  }

  cerrarModal() {
    this.selectedRegistro = null;
    this.selectedUsuario = null;
    this.selectedInventario = null;
  }
}