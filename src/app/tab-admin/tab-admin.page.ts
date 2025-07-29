import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonItem,
  IonButton, IonModal, IonList, IonInput, IonRow, IonCol, IonGrid,
  IonText, IonButtons, IonCard
} from '@ionic/angular/standalone';
import { HistorialService } from '../services/historial.service';
import { Registro, Usuario, Inventario } from '../interface';
import { ServiceService } from '../services/service.service';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-tab-admin',
  templateUrl: './tab-admin.page.html',
  styleUrls: ['./tab-admin.page.scss'],
  standalone: true,
  imports: [
     CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonRow, IonCol, IonGrid,
  ]
})
export class TabAdminPage implements OnInit {

  private historialService = inject(HistorialService);
  private usuarioService = inject(ServiceService);
  private inventarioService = inject(InventarioService);

  registros: Registro[] = [];
  selectedRegistro: Registro | null = null;
  selectedUsuario: Usuario | null = null;
  selectedInventario: Inventario | null = null;

  ngOnInit() {
    this.obtenerMaterialUso();
  }

  obtenerMaterialUso() {
    this.historialService.materialesEnUso().subscribe({
      next: (res) => {
        this.registros = res;
      },
      error: (err) => {
        console.error('Error al obtener registros:', err);
      }
    });
  }

  async verDetalles(registro: Registro) {
    try {
      this.selectedRegistro = registro;

      const usuarioId = (registro.usuarioId as Usuario)?._id || (registro.usuarioId as string);
      const inventarioId = (registro.inventarioId as Inventario)?._id || (registro.inventarioId as string);

      if (usuarioId) {
        const usuario = await this.usuarioService.getUserById(usuarioId).toPromise();
        this.selectedUsuario = usuario ?? null;
      }

      if (inventarioId) {
        const inventario = await this.inventarioService.EquiposId(inventarioId).toPromise();
        this.selectedInventario = inventario ?? null;
      }

      const modal = document.getElementById('detalleModal') as HTMLIonModalElement;
      if (modal) {
        await modal.present();
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
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
    const modal = document.getElementById('detalleModal') as HTMLIonModalElement;
    if (modal) {
      modal.dismiss();
    }
    this.selectedRegistro = null;
    this.selectedUsuario = null;
    this.selectedInventario = null;
  }


getNombreUsuario(registro: Registro): string {
  if (registro.usuarioId && typeof registro.usuarioId !== 'string') {
    return registro.usuarioId.name ?? 'No disponible';
  }
  return 'No disponible';
}

getGrupoUsuario(registro: Registro): string {
  if (registro.usuarioId && typeof registro.usuarioId !== 'string') {
    return registro.usuarioId.grupo ?? 'No disponible';
  }
  return 'No disponible';
}

}



