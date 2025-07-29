import { Component, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule 
} from '@angular/forms';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonText, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonSelect, 
  IonSelectOption, 
  IonLoading, 
  IonToast, 
  IonAvatar, 
  IonCard, 
  IonIcon, 
  IonCardHeader,  
  IonModal,  
  IonList, 
  IonCheckbox, 
  IonButtons 
} from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { InventarioService } from 'src/app/services/inventario.service';
import { Registro, Usuario, Inventario } from '../../interface';
import { FormsModule } from '@angular/forms';
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
  add,
  barcode,
  cube,
  pricetag,
  reader,
  albums,
  imageOutline, eyeOutline 
} from 'ionicons/icons';
import { HttpErrorResponse } from '@angular/common/http';


  
addIcons({
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'construct': construct,
  'notifications-outline': notificationsOutline,
  'mail-outline': mailOutline,
  'log-out-outline': logOutOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'create-outline': createOutline,
  'add': add,
  'barcode': barcode,
  'cube': cube,
  'pricetag': pricetag,
  'reader': reader,
  'albums': albums,
  imageOutline, eyeOutline 
});


@Component({
  selector: 'app-register',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    IonButtons,  
    IonModal,
    IonCheckbox,
    IonCardHeader, 
    IonIcon, 
    IonCard, 
    IonAvatar,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonCard,
    IonText,
    RouterModule
  ]
})
export class RegistroPage {
  userForm: FormGroup;
  selectedFiles: File[] = [];
  imagePreview: string | ArrayBuffer | null = null;
    password: string = '';
  showPassword: boolean = false;
  passwordFieldType: string = 'password';

  mostrandoTerminos = false;
  terminosAceptados = false;

  private fb = inject(FormBuilder);
  private userService = inject(ServiceService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private router = inject(Router);

  constructor() {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      rol: ['user', Validators.required],
      matricula: ['', Validators.required],
      grupo: ['', Validators.required]
    });
  }

    togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.passwordFieldType = this.showPassword ? 'text' : 'password';
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFiles[0]);
    }
  }

  mostrarTerminosCondiciones() {
    this.mostrandoTerminos = true;
  }

  aceptarTerminos() {
    this.terminosAceptados = true;
    this.mostrandoTerminos = false;
    this.presentToast('Términos y condiciones aceptados', 'success');
  }

  rechazarTerminos() {
    this.terminosAceptados = false;
    this.mostrandoTerminos = false;
    this.presentToast('Debes aceptar los términos y condiciones para continuar', 'warning');
  }

  cancelarRegistro() {
    this.userForm.reset();
    this.selectedFiles = [];
    this.terminosAceptados = false;
    this.router.navigate(['/login']);
  }

  async onSubmit() {
    if (this.userForm.invalid) {
      this.presentToast('Por favor, completa todos los campos correctamente.', 'warning');
      return;
    }

    if (!this.terminosAceptados) {
      this.presentToast('Debes aceptar los términos y condiciones para continuar.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registrando usuario...',
      spinner: 'circles',
      duration: 15000
    });
    await loading.present();

    const formData = new FormData();
    formData.append('name', this.userForm.value.name);
    formData.append('email', this.userForm.value.email);
    formData.append('password', this.userForm.value.password);
    formData.append('tel', this.userForm.value.tel);
    formData.append('matricula', this.userForm.value.matricula);
    formData.append('grupo', this.userForm.value.grupo);
    formData.append('rol', this.userForm.value.rol);

    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('files', file, file.name);
      });
    }

    console.log('Datos a enviar:', {
      name: this.userForm.value.name,
      email: this.userForm.value.email,
      tel: this.userForm.value.tel,
      rol: this.userForm.value.rol,
      matricula: this.userForm.value.matricula,
      grupo: this.userForm.value.grupo,
      hasImage: this.selectedFiles.length > 0
    });

    this.userService.createUser(formData).subscribe({
      next: async (response: any) => {
        await loading.dismiss();
        console.log('Respuesta completa:', response);
        if (response.status === 200 || response.status === 201) {
          this.presentToast('Registro exitoso', 'success');
          this.userForm.reset();
          this.selectedFiles = [];
          this.terminosAceptados = false;
          this.router.navigate(['/login']);
        }
      },
      error: async (err: HttpErrorResponse) => {
        await loading.dismiss();
        console.error('Detalles del error:', err);
        let errorMsg = err.error?.message || err.message;
        
        if (err.status === 0) {
          errorMsg = 'No se pudo conectar al servidor';
        } else if (err.status === 400) {
          errorMsg = 'Datos inválidos: ' + errorMsg;
        } else if (err.status === 409) {
          errorMsg = 'El usuario ya existe';
        } else if (err.status === 413) {
          errorMsg = 'El archivo es demasiado grande';
        }
        
        this.presentToast(errorMsg, 'danger');
      }
    });
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  cerrarModal() {
    this.mostrandoTerminos = false;
  }
}