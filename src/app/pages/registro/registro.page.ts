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
  IonToast, IonAvatar, IonCard, IonIcon, IonCardHeader } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonCardHeader, IonIcon, IonCard, IonAvatar, 
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSelect,
    IonSelectOption,
    RouterModule
  ]
})
export class RegistroPage {
  userForm: FormGroup;
  selectedFiles: File[] = [];
  imagePreview: string | ArrayBuffer | null = null;

  private fb = inject(FormBuilder);
  private userService = inject(ServiceService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private router = inject(Router);

  constructor() {
this.userForm = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  password: ['', Validators.required],
  tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  rol: ['user', Validators.required],
  matricula: ['', Validators.required],
  grupo: ['', Validators.required]
});
  }

onFileSelected(event: any) {
  this.selectedFiles = Array.from(event.target.files);

  const reader = new FileReader();
  reader.onload = () => {
    this.imagePreview = reader.result;
  };
  if (this.selectedFiles.length > 0) {
    reader.readAsDataURL(this.selectedFiles[0]);
  }
}
  async onSubmit() {
    if (this.userForm.invalid) {
      this.presentToast('Por favor, completa todos los campos correctamente.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registrando usuario...',
      spinner: 'circles'
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

    this.selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    this.userService.createUser(formData).subscribe({
      next: async () => {
        await loading.dismiss();
        this.presentToast('Usuario creado correctamente.', 'success');
        this.userForm.reset();
        this.selectedFiles = [];
        this.router.navigate(['/login']);
      },
      error: async (err) => {
        await loading.dismiss();
        console.error(err);
        this.presentToast('Error al crear el usuario.', 'danger');
      }
    });
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
