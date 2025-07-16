import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
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
  IonSelectOption
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
    IonSelectOption
  ]
})
export class Tab2Page {
  equipos: any[] = [];
  estadoSeleccionado = '';
  materiales: Inventario[] = [];
  categorias: string[] = ['Herramientas', 'Electrónica', 'Mecánica', 'Laboratorio', 'Multimedia'];
  categoriaSeleccionada: string = '';

  private inventarioServices = inject(InventarioService);
  private router = inject(Router);

  constructor(
    private inventarioService: InventarioService,
    private toastController: ToastController
  ) {
    addIcons({ filter, ellipsisVerticalOutline }); 
  }

  ngOnInit() {
    this.refrescarComponente();
    this.obtenerEquipos();
    this.obtenerMateriales();
  }

  refrescarComponente() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  obtenerEquipos() {
    this.inventarioServices.Equipos().subscribe({
      next: (res) => {
        this.equipos = res;
        console.log('Equipos cargados:', this.equipos);
      },
      error: (err) => {
        console.error('Error al obtener los equipos:', err);
      }
    });
  }

  filtrarPorEstado(estado: string) {
    this.estadoSeleccionado = estado;

    if (!estado) {
      this.obtenerEquipos();
      return;
    }

    const estadoNormalizado = estado.trim().toLowerCase();

    this.inventarioServices.Equipos().subscribe({
      next: (res) => {
        this.equipos = res.filter(e =>
          e.estado && e.estado.trim().toLowerCase() === estadoNormalizado
        );
        console.log(`Filtrado local por ${estado}:`, this.equipos);
      },
      error: (err) => {
        console.error(`Error al filtrar por ${estado}:`, err);
      }
    });
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

  onCategoriaChange() {
    this.obtenerMateriales();
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