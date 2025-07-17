import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
  IonList, IonBackButton, IonButtons, IonModal, IonRow, IonGrid, IonCol, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonAvatar } from '@ionic/angular/standalone';
import { HistorialService } from '../services/historial.service';
import { Registro, Usuario, Inventario } from '../interface';
import { ServiceService } from '../services/service.service';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-tab2-admin',
  templateUrl: './tab2-admin.page.html',
  styleUrls: ['./tab2-admin.page.scss'],
  standalone: true,
  imports: [IonAvatar, IonCardContent, IonCardSubtitle, IonCardTitle, IonCardHeader, IonCard, IonIcon, IonCol, IonGrid, IonRow, 
    IonButtons, IonList, IonLabel, IonItem, IonButton, IonContent, CommonModule,
    FormsModule, IonHeader, IonToolbar, IonTitle, IonModal, IonBackButton
  ]
})
export class Tab2AdminPage implements OnInit {

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

  getNombreMaterial(registro: Registro): string {
  if (registro.inventarioId && typeof registro.inventarioId !== 'string') {
    return registro.inventarioId.name;
  }
  return 'Sin nombre';
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


}
