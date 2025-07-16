import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel,
  IonList, IonBackButton, IonButtons, IonModal, IonRow, IonGrid, IonCol } from '@ionic/angular/standalone';
import { HistorialService } from '../services/historial.service';
import { Registro, Usuario, Inventario } from '../interface';
import { ServiceService } from '../services/service.service';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-tab2-admin',
  templateUrl: './tab2-admin.page.html',
  styleUrls: ['./tab2-admin.page.scss'],
  standalone: true,
  imports: [IonCol, IonGrid, IonRow, 
     IonList, IonLabel, IonItem, IonButton, IonContent, CommonModule,
    FormsModule, IonHeader, IonToolbar, IonTitle, IonModal
  ]
})
export class Tab2AdminPage implements OnInit {

  private historialServices = inject(HistorialService);
    private usuarioService = inject(ServiceService);
  private inventarioService = inject(InventarioService);

  
  registros: any[] = [];
   selectedRegistro: Registro | null = null;
    selectedUsuario: Usuario | null = null;
    selectedInventario: Inventario | null = null;

  @ViewChild('detallesModal') detallesModal!: IonModal;
  registroSeleccionado: any = null;

  ngOnInit() {
    this.obtenerMaterialUso();
  }

  obtenerMaterialUso() {
    this.historialServices.obtenerHistorial().subscribe({
      next: (Response) => {
        this.registros = Response;
        console.log('Equipos cargados:', this.registros);
      },
      error: (err) => {
        console.error('Error al obtener los equipos:', err);
      }
    });
  }

  constructor() {}

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

  cerrarModal() {
    const modal = document.getElementById('detalleModal') as HTMLIonModalElement;
    if (modal) {
      modal.dismiss();
    }
    this.selectedRegistro = null;
    this.selectedUsuario = null;
    this.selectedInventario = null;
  }
}
