import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
  IonList, IonButtons, IonModal, IonRow, IonGrid, IonCol, IonIcon,  
  IonItemDivider } from '@ionic/angular/standalone';
import { HistorialService } from '../services/historial.service';
import { Registro, Usuario, Inventario } from '../interface';
import { ServiceService } from '../services/service.service';
import { InventarioService } from '../services/inventario.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-tab2-admin',
  templateUrl: './tab2-admin.page.html',
  styleUrls: ['./tab2-admin.page.scss'],
  standalone: true,
  imports: [
    IonItemDivider, IonIcon, IonCol, IonGrid, IonRow, IonButtons, IonList, 
    IonLabel, IonItem, IonButton, IonContent, CommonModule, FormsModule, IonHeader, 
    IonToolbar, IonTitle, IonModal
  ]
})
export class Tab2AdminPage implements OnInit {
  private historialService = inject(HistorialService);
  private usuarioService = inject(ServiceService);
  private inventarioService = inject(InventarioService);

   selectedSegment: string = 'tab1';
  registros: Registro[] = [];
  historialCompleto: Registro[] = [];
  selectedRegistro: Registro | null = null;
  selectedUsuario: Usuario | null = null;
  selectedInventario: Inventario | null = null;
  prestamosQR: Registro[] = [];
  prestamosReserva: Registro[] = [];
  mostrarModal: boolean = false;

  ngOnInit() {
    this.cargarTodosLosPrestamos();
  }
    segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }


  // Método para cargar todos los préstamos (activos e históricos)
  cargarTodosLosPrestamos() {
    forkJoin([
      this.historialService.materialesEnUso(),
      this.historialService.obtenerHistorial()
    ]).subscribe({
      next: ([activos, historico]) => {
        // Combinar y eliminar duplicados
        const todos = [...activos, ...historico];
        const idsUnicos = new Set();
        
        this.registros = todos.filter(prestamo => {
          const id = prestamo._id;
          if (!idsUnicos.has(id)) {
            idsUnicos.add(id);
            return true;
          }
          return false;
        });

        // Ordenar por fecha más reciente primero
        this.registros.sort((a, b) => 
          new Date(b.fechaPrestamo).getTime() - new Date(a.fechaPrestamo).getTime()
        );
      },
      error: (err) => {
        console.error('Error al cargar préstamos:', err);
      }
    });
  }

  // Método para cargar el historial completo de un usuario
  async cargarHistorialCompleto(usuarioId: string) {
    try {
      const todos = await this.historialService.obtenerHistorial().toPromise();
      this.historialCompleto = (todos || []).filter((p: Registro) => {
        const idUsuario = typeof p.usuarioId === 'string' ? p.usuarioId : p.usuarioId?._id;
        return idUsuario === usuarioId;
      });
      
      // Ordenar por fecha más reciente primero
      this.historialCompleto.sort((a, b) => 
        new Date(b.fechaPrestamo).getTime() - new Date(a.fechaPrestamo).getTime()
      );

      // Filtrar por tipo
      this.prestamosQR = this.historialCompleto.filter(p => p.tipoPrestamo === 'qr');
      this.prestamosReserva = this.historialCompleto.filter(p => p.tipoPrestamo === 'reserva');
    } catch (error) {
      console.error('Error al cargar historial completo:', error);
    }
  }

async verDetalles(registro: Registro) {
  try {
    this.selectedRegistro = registro;
    const usuarioId = (registro.usuarioId as Usuario)?._id || (registro.usuarioId as string);
    const inventarioId = (registro.inventarioId as Inventario)?._id || (registro.inventarioId as string);

    // Obtener datos del usuario
    if (usuarioId) {
      const usuario = await this.usuarioService.getUserById(usuarioId).toPromise();
      this.selectedUsuario = usuario ?? null;
      await this.cargarHistorialCompleto(usuarioId);
    }

    // Obtener datos del inventario
    if (inventarioId) {
      const inventario = await this.inventarioService.EquiposId(inventarioId).toPromise();
      this.selectedInventario = inventario ?? null;
    }

    this.mostrarModal = true; // ← Esto ya es suficiente para mostrar el modal
  } catch (error) {
    console.error('Error al cargar detalles:', error);
  }
}


  // Métodos auxiliares para mostrar datos
  getNombreMaterial(registro: Registro): string {
    if (registro.inventarioId && typeof registro.inventarioId !== 'string') {
      return registro.inventarioId.name;
    }
    return 'Sin nombre';
  }

  getCodigo(registro: Registro): string {
    if (registro.inventarioId && typeof registro.inventarioId !== 'string') {
      return registro.inventarioId.nseries;
    }
    return 'Sin código';
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return '#2dd36f'; // success (verde)
      case 'Ocupado': return '#ffc409';    // warning (amarillo)
      case 'En Mantenimiento': return '#eb445a'; // danger (rojo)
      default: return '#92949c';           // medium (gris)
    }
  }

cerrarModal() {
  this.mostrarModal = false;
  this.selectedRegistro = null;
  this.selectedUsuario = null;
  this.selectedInventario = null;
  this.prestamosQR = [];
  this.prestamosReserva = [];
}
  getNombreUsuario(registro: Registro): string {
    if (registro.usuarioId && typeof registro.usuarioId !== 'string') {
      return registro.usuarioId.name ?? 'No disponible';
    }
    return 'No disponible';
  }

getNombreInventario(inventario: string | Inventario | null | undefined): string {
  if (inventario && typeof inventario === 'object') {
    return inventario.name || 'Material desconocido';
  }
  return 'Material desconocido';
}

  getPropiedadUsuario(usuario: string | Usuario, propiedad: keyof Usuario): string {
    if (typeof usuario === 'object' && usuario !== null) {
      const valor = usuario[propiedad];
      return valor !== undefined && valor !== null ? String(valor) : `Sin ${propiedad}`;
    }
    return `Sin ${propiedad}`;
  }
}