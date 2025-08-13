import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
  IonToast,
  IonCard,
  IonCardHeader,
  IonAvatar,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBackButton,
  IonButtons, IonList
} from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { Usuario } from 'src/app/interface';
import { addIcons } from 'ionicons';
import { cameraOutline, checkmarkCircle, closeCircle, construct, imageOutline, navigate, save, trash,close, add, trashOutline, arrowBackOutline } from 'ionicons/icons';




addIcons({
  checkmarkCircle,
  closeCircle,
  construct,
  cameraOutline, imageOutline,trash,save,close, // nuevo ícono agregado
});


@Component({
  selector: 'app-edit-profile',
  templateUrl: './editperfil.page.html',
  styleUrls: ['./editperfil.page.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [IonList,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonCard,
    IonCardHeader,
    IonAvatar,
    IonCardContent,
    IonIcon,
    IonButtons,
  ],
})
export class EditperfilPage implements OnInit {
  userForm!: FormGroup;
  
  usuario: Partial<Usuario> = { name: '', email: '' };
  selectedFiles: File[] = [];
  userId!: string;
  previewImage: string | null = null; // Simplificado a solo string
  currentUser!: Usuario;
  isAdmin: boolean = false;
    imagenesPreview: string[] = [];   // urls + previews
  imagenesAEliminar: string[] = []; // ids en BD a borrar

  private serviceService = inject(ServiceService);

  fb = inject(FormBuilder);
  userService = inject(ServiceService);
  toastController = inject(ToastController);
  router = inject(Router);

  ngOnInit() {
    const storedUser: Usuario = JSON.parse(localStorage.getItem('User') || '{}');
    this.currentUser = storedUser;
    this.userId = storedUser?._id;
    this.isAdmin = storedUser?.rol === 'admin';

    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.initForm();
    this.cargarUsuario();
  }

initForm() {
  this.userForm = this.fb.group({
    name: [this.usuario.name || '', Validators.required],
    email: [this.usuario.email || '', [Validators.required, Validators.email]],
    password: [''],
    tel: [this.usuario.tel || ''],
    matricula: [this.usuario.matricula || ''],
    grupo: [this.usuario.grupo || ''],
    rol: [{ value: this.usuario.rol || '', disabled: true }]
  });

  if (!this.isAdmin) {
    this.userForm.get('tel')?.setValidators([Validators.required]);
    this.userForm.get('matricula')?.setValidators([Validators.required]);
    this.userForm.get('grupo')?.setValidators([Validators.required]);
  }
}

  async onSubmit() {
  if (this.userForm.invalid) {
    const toast = await this.toastController.create({
      message: 'Por favor complete todos los campos requeridos.',
      duration: 2000,
      color: 'danger',
    });
    toast.present();
    return;
  }

  const formValue = this.userForm.getRawValue();
  const updateData: any = {
    name: formValue.name,
    email: formValue.email
  };

  if (formValue.password) updateData.password = formValue.password;

  if (!this.isAdmin) {
    updateData.tel = formValue.tel;
    updateData.matricula = formValue.matricula;
    updateData.grupo = formValue.grupo;
  }

  try {
    let response: any;

    if (this.selectedFiles.length > 0) {
      const formData = new FormData();
      Object.keys(updateData).forEach(key => formData.append(key, updateData[key]));
      this.selectedFiles.forEach(file => formData.append('files', file));
      
      response = await this.serviceService.updateUser(this.userId, formData, true).toPromise();
    } else {
      response = await this.serviceService.updateUser(this.userId, updateData).toPromise();
    }

    // Manejo más robusto de la respuesta
    const updatedUser = response?.user || response?.data || response;
    
    if (!updatedUser) {
      throw new Error('No se recibieron datos actualizados del servidor');
    }

    // Actualizar localStorage completamente
    localStorage.setItem('User', JSON.stringify(updatedUser));
    this.currentUser = updatedUser;

    const toast = await this.toastController.create({
      message: 'Perfil actualizado correctamente',
      duration: 2000,
      color: 'success',
    });
    toast.present();
    
    this.redireccionarPorRol(updatedUser.rol);

  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    const errorMessage = error.error?.message || error.message || 'Error desconocido al actualizar el perfil';
    
    const toast = await this.toastController.create({
      message: errorMessage,
      duration: 3000,
      color: 'danger',
    });
    toast.present();
  }
}

  redireccionarPorRol(rol: string) {
  if (rol === 'admin') {
    this.router.navigate(['/tabs-Admin/tab5']);
  } else {
    this.router.navigate(['/tabs/tab3']);
  }
}


cancel() {
  if (this.currentUser?.rol === 'admin') {
    this.router.navigate(['/tabs-Admin/tab5']);
  } else {
    this.router.navigate(['/tabs/tab3']);
  }
}



  abrirSelector() {
    (document.getElementById('fileInput') as HTMLInputElement).click();
  }

  private async presentToast(msg: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({ message: msg, duration: 2000, color, position: 'top' });
    await toast.present();
  }


  // Función loadUser actualizada
private async cargarUsuario(): Promise<void> {
  const userLS = localStorage.getItem('User');
  if (userLS && userLS !== 'undefined') {
    const parsed = JSON.parse(userLS);

    this.usuario = {
      _id: parsed._id || '',
      name: parsed.name || '',
      email: parsed.email || '',
      tel: parsed.tel || '',
      rol: parsed.rol || '',
      imagen: parsed.imagen || (parsed.imagenes?.[0]?.url || ''),
      matricula: parsed.matricula || '',
      grupo: parsed.grupo || ''
    };

    // Llena el formulario con los datos del usuario
    this.userForm.patchValue({
      name: this.usuario.name,
      email: this.usuario.email,
      tel: this.usuario.tel,
      matricula: this.usuario.matricula,
      grupo: this.usuario.grupo,
      rol: this.usuario.rol
    });
  }
}


// Función removeImage actualizada
removeImage(index: number) {
  // Verificar si es una imagen existente (del usuario) o nueva (seleccionada)
  const existentes = this.currentUser.imagen || [];
  
  if (index < existentes.length) {
    // Es una imagen existente - agregar a lista de eliminación
    // Como es string[], no tenemos _id, usamos el índice o la URL como referencia
    this.imagenesAEliminar.push(existentes[index]);
  } else {
    // Es una imagen nueva - eliminar de selectedFiles
    const fileIndex = index - existentes.length;
    this.selectedFiles.splice(fileIndex, 1);
  }
  
  // Eliminar de las previews
  this.imagenesPreview.splice(index, 1);
  
  this.presentToast('Imagen eliminada', 'warning');
}




  getImagenPerfil(): string {
    if (this.usuario?.imagen) {
      return this.usuario.imagen && this.usuario.imagen[0]?.startsWith('http') 
        ? this.usuario.imagen[0] 
        : `http://localhost:3001/${this.usuario.imagen?.[0]}`;
    }
    return 'assets/utvcoIMAGEN.jpg';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/utvcoIMAGEN.jpg';
  }


// Función clearForm actualizada
clearForm() {
  this.userForm.reset({
    rol: this.currentUser.rol
  });

  // Restablecer imágenes preview
  this.imagenesPreview = [];
  
  if (this.currentUser.imagen && this.currentUser.imagen.length > 0) {
    this.imagenesPreview = [...this.currentUser.imagen];
  }

  this.selectedFiles = [];
}



deleteCurrentImage(): void {
  // Limpia la vista previa
  this.previewImage = null;
  
  // Limpia las imágenes del usuario actual
  this.currentUser.imagen = []; // Esto funciona tanto para string como para array
  
  // Limpia los archivos seleccionados y las vistas previas
  this.selectedFiles = [];
  this.imagenesPreview = [];
  
  // Actualiza el localStorage para reflejar los cambios
  localStorage.setItem('User', JSON.stringify(this.currentUser));
  
  // Muestra feedback al usuario
  this.presentToast('Imagen eliminada correctamente', 'warning');
  
  // Opcional: Si quieres restaurar la imagen por defecto
  // this.previewImage = 'assets/utvcoIMAGEN.jpg';
}


// Función onFileSelected se mantiene igual
onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    this.presentToast('Solo se permiten imágenes', 'warning');
    return;
  }

  this.selectedFiles = [file]; // Guarda el archivo seleccionado
  const reader = new FileReader();
  reader.onload = e => {
    this.previewImage = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}



}