import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, 
  IonInput, IonList, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonButtons, IonBackButton, IonGrid, IonRow, 
  IonCol, IonIcon, IonChip, IonTextarea, IonToast 
} from '@ionic/angular/standalone';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router';
import { Inventario } from '../interface';
import { ToastController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';

import {
  checkmarkCircle, closeCircle, construct, notificationsOutline, mailOutline, 
  logOutOutline, arrowForwardOutline, createOutline, add, barcode, cube, pricetag, 
  reader, albums,
} from 'ionicons/icons';
import { ModalController } from '@ionic/angular';
import { CategoriaModalComponent } from '../components/categoria-modal.component.ts/categoria-modal.component';

addIcons({
  'checkmark-circle':  checkmarkCircle,
  'close-circle':      closeCircle,
  'construct':         construct,
  'notifications-outline': notificationsOutline,
  'mail-outline':      mailOutline,
  'log-out-outline':   logOutOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'create-outline':    createOutline,
  'add':               add,
  'barcode':           barcode,
  'cube':              cube,
  'pricetag':          pricetag,
  'reader':            reader,
  'albums':            albums,
});

@Component({
  selector: 'app-tab4-admin',
  templateUrl: './tab4-admin.page.html',
  styleUrls: ['./tab4-admin.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class Tab4AdminPage implements OnInit {
  private inventarioService = inject(InventarioService);
  private toastController = inject(ToastController);
  private router = inject(Router);

    equipoId: string = ''; // Nueva propiedad para almacenar el ID del equipo
  isEditing: boolean = false;
  categorias: string[] = [];

  equipo: Inventario = {
    name: '',
    model: '',
    description: '',
    categoria: '',
    nseries: '',
    estado: 'Disponible',
    imagenes: [],
  };

  equipoOriginal: Inventario = { ...this.equipo }; // Clonado al inicio

  selectedFiles: File[] = [];
  imagenesPreview: string[] = [];

  constructor(private modalCtrl: ModalController) {
      addIcons({closeCircle,add,cube,pricetag,reader,albums,barcode,checkmarkCircle,construct});}

  ngOnInit() {
    this.cargarCategorias();
  }


  cargarCategorias() {
  this.inventarioService.obtenerCategorias().subscribe({
    next: (categorias: string[]) => {
      this.categorias = categorias;
    },
    error: (error) => {
      this.presentToast('Error al cargar categorías', 'danger');
      console.error(error);
    }
  });
}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    if (this.imagenesPreview.length + files.length > 5) {
      this.presentToast('Máximo 5 imágenes permitidas', 'warning');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        this.presentToast('Solo se permiten archivos de imagen', 'warning');
        return;
      }

      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.imagenesPreview.push(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  }


  async abrirModalCategorias() {
  const modal = await this.modalCtrl.create({
    component: CategoriaModalComponent
  });

  await modal.present();
}

  removeImage(index: number): void {
    this.imagenesPreview.splice(index, 1);
    this.selectedFiles.splice(index, 1);
    this.presentToast('Imagen eliminada', 'warning');
  }

  cambiarEstado(estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento'): void {
    this.equipo.estado = estado;
    this.presentToast(`Estado cambiado a: ${estado}`, 'success');
  }

  registrarEquipo(): void {
    if (!this.equipo.name || !this.equipo.model || !this.equipo.categoria || 
        !this.equipo.description || !this.equipo.nseries) {
      this.presentToast('Todos los campos son obligatorios', 'warning');
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.presentToast('Debes seleccionar al menos una imagen', 'warning');
      return;
    }

    const cambios: Partial<Inventario> = {};
    for (const key in this.equipo) {
      if ((this.equipo as any)[key] !== (this.equipoOriginal as any)[key]) {
        (cambios as any)[key] = (this.equipo as any)[key];
      }
    }

    const formData = new FormData();
    for (const key in cambios) {
      formData.append(key, (cambios as any)[key]);
    }

    this.selectedFiles.forEach((file, index) => {
      formData.append('imagenes', file, `imagen-${index}-${file.name}`);
    });

    this.inventarioService.registrarEquipoConImagenes(formData).subscribe(
      (response: any) => {
        this.presentToast('Equipo registrado correctamente', 'success');
        this.limpiarFormulario();
        this.router.navigate(['/tabs-Admin/tab4']);
      },
      (error: any) => {
        console.error('Error al registrar equipo:', error);
        this.presentToast('Error al registrar equipo', 'danger');
      }
    );
  }

  abrirSelector(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }

  limpiarFormulario(): void {
    this.equipo = {
      name: '',
      model: '',
      description: '',
      categoria: '',
      nseries: '',
      estado: 'Disponible',
      imagenes: [],
    };
    this.equipoOriginal = { ...this.equipo };
    this.selectedFiles = [];
    this.imagenesPreview = [];
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
