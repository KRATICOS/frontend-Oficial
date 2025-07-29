import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, ViewChild } from '@angular/core';
import {
  IonButton,
  IonCol,
  IonContent,
  IonRow,
  IonGrid,
  IonBadge,
  IonCardContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonImg,
  IonLabel,
  IonText,
  IonSelect,
  IonSelectOption,
  IonSearchbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisVerticalOutline, filter } from 'ionicons/icons';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { InventarioService } from '../services/inventario.service';
import { Inventario } from '../interface';
import {
  callOutline,
  idCardOutline,
  peopleOutline,
  personOutline,
  createOutline,
  logOutOutline,
  arrowForwardOutline
} from 'ionicons/icons';

addIcons({
  callOutline,
  idCardOutline,
  peopleOutline,
  personOutline,
  createOutline,
  logOutOutline,
  arrowForwardOutline
});

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonItem,
    IonText,
    IonLabel,
    IonImg,
    IonCardTitle,
    IonCol,
    IonCardHeader,
    IonCard,
    IonButton,
    IonCardContent,
    IonBadge,
    IonGrid,
    IonRow,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonSearchbar
  ]
})
export class Tab2Page {
    @ViewChild('categoriaSelect', { static: false }) categoriaSelect!: IonSelect;

  equipos: any[] = [];
  materiales: Inventario[] = [];
  equiposOriginales: any[] = [];
  searchTerm = '';
  estadoSeleccionado = '';
  categoriaSeleccionada = '';

  categorias = [
    'Herramientas',
    'Proyectores',
    'Mecánica',
    'Componentes',
    'Laboratorio',
    'Instrumento de medicion'
  ];

  private inventarioServices = inject(InventarioService);
  private router = inject(Router);

  constructor(
    private inventarioService: InventarioService,
    private toastController: ToastController
  ) {
    addIcons({ filter, ellipsisVerticalOutline }); 
  }

  ngOnInit() {
    this.obtenerEquipos();
    this.obtenerMateriales();
  }

    ionViewDidEnter() {
    setTimeout(() => {
      this.categoriaSelect?.open();
    }, 300);
  }

  obtenerEquipos() {
    this.inventarioServices.Equipos().subscribe({
      next: (res) => {
        this.equipos = res;
        this.equiposOriginales = [...res];
        console.log('Equipos cargados:', this.equipos);
      },
      error: (err) => {
        console.error('Error al obtener los equipos:', err);
      }
    });
  }

  buscarEquipos(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let equiposFiltrados = [...this.equiposOriginales];

    // Filtro por categoría
    if (this.categoriaSeleccionada) {
      equiposFiltrados = equiposFiltrados.filter(
        e => e.categoria?.toLowerCase() === this.categoriaSeleccionada.toLowerCase()
      );
    }

    // Filtro por estado
    if (this.estadoSeleccionado) {
      equiposFiltrados = equiposFiltrados.filter(
        e => e.estado?.toLowerCase() === this.estadoSeleccionado.toLowerCase()
      );
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      equiposFiltrados = equiposFiltrados.filter(e =>
        e.name?.toLowerCase().includes(this.searchTerm) ||
        e.description?.toLowerCase().includes(this.searchTerm) ||
        e.model?.toLowerCase().includes(this.searchTerm) ||
        e.nseries?.toLowerCase().includes(this.searchTerm)
      );
    }

    this.equipos = equiposFiltrados;
  }

  limpiarFiltros() {
    this.categoriaSeleccionada = '';
    this.estadoSeleccionado = '';
    this.searchTerm = '';
    this.equipos = [...this.equiposOriginales];
  }

  filtrarPorCategoria() {
    this.aplicarFiltros();
  }

  filtrarPorEstado() {
    this.aplicarFiltros();
  }

  ionViewWillEnter() {
    this.obtenerMateriales();
  }

  obtenerMateriales() {
    if (this.categoriaSeleccionada) {
      this.inventarioService.obtenerPorCategoria(this.categoriaSeleccionada).subscribe({
        next: (data) => {
          this.materiales = data;
        },
        error: () => {
          this.presentToast('Error al cargar materiales por categoría', 'danger');
        }
      });
    } else {
      this.inventarioService.Equipos().subscribe({
        next: (data) => {
          this.materiales = data;
        },
        error: () => {
          this.presentToast('Error al cargar materiales', 'danger');
        }
      });
    }
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  verDetalles(id: string) {
    console.log('Equipo seleccionado:', id);
    this.router.navigate(['/reserva'], { queryParams: { id } });
  }
}