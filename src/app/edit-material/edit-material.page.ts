import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonList,
  IonTitle,
  IonToolbar,
  IonHeader,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonChip,
  IonTextarea,
  LoadingController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { InventarioService } from '../services/inventario.service';
import { Inventario } from '../interface';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle, closeCircle, construct, notificationsOutline,
  mailOutline, logOutOutline, arrowForwardOutline, createOutline,
  add, barcode, cube, pricetag, reader, albums, trash
} from 'ionicons/icons';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-actualizar-material',
  templateUrl: './edit-material.page.html',
  styleUrls: ['./edit-material.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
    IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle,  IonCardContent,
    IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonButton, IonIcon, IonChip
  ]
})
export class EditMaterialPage implements OnInit {

  private inventarioService = inject(InventarioService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  equipoId = '';
  equipo!: Inventario;
  cargando: boolean = true;

  // Reactive form
  equipoForm!: FormGroup;

  // Imágenes
  imagenesPreview: string[] = [];   // urls + previews
  imagenesAEliminar: string[] = []; // ids en BD a borrar
  selectedFiles: File[] = [];        // nuevas imágenes

  readonly categorias = [
    'Herramientas', 'Proyectores', 'Mecánica',
    'Componentes', 'Laboratorio', 'Instrumento de medicion'
  ];

  constructor() {
    addIcons({
      trash,
      closeCircle,
      add,
      cube,
      pricetag,
      reader,
      albums,
      barcode,
      checkmarkCircle,
      construct,
      notificationsOutline,
      mailOutline,
      logOutOutline,
      arrowForwardOutline,
      createOutline
    });
  }

async ngOnInit() {
  this.equipoId = this.activatedRoute.snapshot.paramMap.get('id') || '';

  if (!this.equipoId) {
    await this.presentToast('No se proporcionó ID de equipo', 'danger');
    this.router.navigateByUrl('/tabs-Admin/tab3');
    return;
  }

  await this.cargarEquipo(); // SOLO cargamos el equipo aquí
}


  private initEmptyForm() {
  this.equipoForm = this.fb.group({
    name: ['', Validators.required],
    model: ['', Validators.required],
    description: ['', Validators.required],
    categoria: ['', Validators.required],
    nseries: ['', Validators.required],
    estado: ['Disponible', Validators.required]
  });
}

private async cargarEquipo() {
  const loading = await this.loadingController.create({ 
    message: 'Cargando equipo…',
    spinner: 'crescent'
  });
  
  await loading.present();
  
  try {
    this.equipo = await firstValueFrom(
      this.inventarioService.EquiposId(this.equipoId).pipe(
        timeout(10000),
        catchError(error => {
          console.error('Error al cargar equipo:', error);
          this.presentToast('Error al cargar los datos del equipo', 'danger');
          this.router.navigateByUrl('/tabs-Admin/tab3');
          return throwError(() => new Error(error));
        })
      )
    );

    // Carga previews de imágenes si existen
    this.imagenesPreview = this.equipo.imagenes?.map(img => img.url) ?? [];

    // Aquí SÍ se crea el formulario con los datos cargados ✅
    this.equipoForm = this.fb.group({
      name: [this.equipo.name, Validators.required],
      model: [this.equipo.model, Validators.required],
      description: [this.equipo.description, Validators.required],
      categoria: [this.equipo.categoria, Validators.required],
      nseries: [this.equipo.nseries, Validators.required],
      estado: [this.equipo.estado || 'Disponible', Validators.required]
    });

  } catch (error) {
    console.error('Error inesperado:', error);
    await this.presentToast('Error inesperado al cargar equipo', 'danger');
    this.router.navigateByUrl('/tabs-Admin/edit-material');
  } finally {
    await loading.dismiss();
  }
}


private patchFormValues() {
  this.equipoForm.patchValue({
    name: this.equipo?.name,
    model: this.equipo?.model,
    description: this.equipo?.description,
    categoria: this.equipo?.categoria,
    nseries: this.equipo?.nseries,
    estado: this.equipo?.estado
  });
}

private initForm() {
  this.equipoForm = this.fb.group({
    name: [this.equipo?.name || '', Validators.required],
    model: [this.equipo?.model || '', Validators.required],
    description: [this.equipo?.description || '', Validators.required],
    categoria: [this.equipo?.categoria || '', Validators.required],
    nseries: [this.equipo?.nseries || '', Validators.required],
    estado: [this.equipo?.estado || 'Disponible', Validators.required]
  });
}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    if (this.imagenesPreview.length + files.length > 5) {
      this.presentToast('Máximo 5 imágenes en total', 'warning');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        this.presentToast('Solo se permiten imágenes', 'warning');
        return;
      }
      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) this.imagenesPreview.push(e.target.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    const existentes = this.equipo.imagenes ?? [];
    if (index < existentes.length && existentes[index]._id) {
      this.imagenesAEliminar.push(existentes[index]._id);
    } else {
      const idxFile = index - existentes.length;
      this.selectedFiles.splice(idxFile, 1);
    }
    this.imagenesPreview.splice(index, 1);
    this.presentToast('Imagen eliminada', 'warning');
  }

  cambiarEstado(estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento') {
    this.equipoForm.patchValue({ estado });
    this.presentToast(`Estado cambiado a ${estado}`, 'success');
  }

  async actualizarEquipo() {
    if (this.equipoForm.invalid) {
      this.presentToast('Por favor completa todos los campos obligatorios', 'warning');
      return;
    }

    const totalRestante = (this.equipo.imagenes?.length ?? 0) - this.imagenesAEliminar.length + this.selectedFiles.length;
    if (totalRestante <= 0) {
      this.presentToast('Debe quedar al menos una imagen', 'warning');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Actualizando…' });
    await loading.present();

    try {
      const fd = new FormData();
      const formValue = this.equipoForm.value;

      fd.append('name', formValue.name);
      fd.append('model', formValue.model);
      fd.append('description', formValue.description);
      fd.append('categoria', formValue.categoria);
      fd.append('nseries', formValue.nseries);
      fd.append('estado', formValue.estado);

      this.imagenesAEliminar.forEach(id => fd.append('imagenesAEliminar', id));
      this.selectedFiles.forEach((file, i) => fd.append('nuevasImagenes', file, `img-${i}-${file.name}`));

      await firstValueFrom(this.inventarioService.actualizarEquipo(this.equipoId, fd));

          await loading.dismiss(); // 👈 aseguramos que el loading se cierre ANTES de navegar

    await this.presentToast('Equipo actualizado', 'success');

      this.presentToast('Equipo actualizado', 'success');
      this.router.navigate(['/tabs-Admin/tab3']);
    } catch (error) {
      console.error('Error al actualizar equipo:', error);
      this.presentToast('Error al actualizar equipo', 'danger');
    } finally {
      await loading.dismiss();
    }
  }


  async confirmarEliminacion() {
    const alert = await this.alertController.create({
      header: 'Eliminar equipo',
      message: '¿Seguro que deseas eliminarlo permanentemente?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', handler: () => this.eliminarEquipo() }
      ]
    });
    await alert.present();
  }

  private async eliminarEquipo() {
    const loading = await this.loadingController.create({ message: 'Eliminando…' });
    await loading.present();
    try {
      await firstValueFrom(this.inventarioService.eliminarEquipo(this.equipoId));
      this.presentToast('Equipo eliminado', 'success');
      this.router.navigate(['/tabs-Admin/edit-material']);
    } catch {
      this.presentToast('Error al eliminar', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  abrirSelector() {
    (document.getElementById('fileInput') as HTMLInputElement).click();
  }

  private async presentToast(msg: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({ message: msg, duration: 2000, color, position: 'top' });
    await toast.present();
  }
}
