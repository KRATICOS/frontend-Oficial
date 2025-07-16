import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, 
  IonInput, IonList, IonTitle, IonToolbar, IonHeader, IonCard, IonCardHeader, 
  IonCardTitle, IonCardSubtitle, IonCardContent, IonButtons, IonBackButton, 
  IonGrid, IonRow, IonCol, IonIcon, IonChip, IonTextarea, IonToast 
} from '@ionic/angular/standalone';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router';
import { Inventario } from '../interface';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  closeCircle,
  construct,
  notificationsOutline,
  mailOutline,
  logOutOutline,
  arrowForwardOutline,
  createOutline,
  // 👇 nuevos + reales en tu template
  add,
  barcode,
  cube,
  pricetag,
  reader,
  albums,
} from 'ionicons/icons';

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
    IonChip, IonIcon, IonCol, IonRow, IonGrid, IonBackButton, IonButtons, 
    IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonHeader, IonToolbar, 
    IonTitle, IonList, CommonModule, FormsModule, IonContent, IonButton, IonItem, 
    IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption
  ]
})
export class Tab4AdminPage implements OnInit {
  private inventarioService = inject(InventarioService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  readonly categorias: string[] = [
    'Herramientas',
    'Proyectores',
    'Mecánica',
    'Componentes',
    'Laboratorio',
    'Instrumento de medicion'
  ];

  equipo: Inventario = {
    name: '',
    model: '',
    description: '',
    categoria: '',
    nseries: '',
    estado: 'Disponible',
    imagenes: [],
  };

  selectedFiles: File[] = [];
  imagenesPreview: string[] = [];

  constructor() { }

  ngOnInit() { }

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

    const formData = new FormData();
    formData.append('name', this.equipo.name);
    formData.append('model', this.equipo.model);
    formData.append('description', this.equipo.description);
    formData.append('categoria', this.equipo.categoria);
    formData.append('nseries', this.equipo.nseries);
    formData.append('estado', this.equipo.estado);

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