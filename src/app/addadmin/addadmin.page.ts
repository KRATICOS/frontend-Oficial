import { Component, OnInit, inject } from '@angular/core';
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
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonLoading,
  IonAvatar,
  IonCard,
  IonIcon,
  IonCardHeader
} from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { Usuario } from 'src/app/interface';
import { addIcons } from 'ionicons';
import { cameraOutline, imageOutline} from 'ionicons/icons';




addIcons({

  cameraOutline, imageOutline, // nuevo ícono agregado
});



@Component({
  selector: 'app-addadmin',
  templateUrl: './addadmin.page.html',
  styleUrls: ['./addadmin.page.scss'],
  standalone: true,
  imports: [
    IonCardHeader,
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
    IonSelect,
    IonSelectOption,
    IonAvatar,
    IonCard,
    IonIcon
  ]
})
export class AddadminPage implements OnInit {
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
      password: ['', [Validators.required, Validators.minLength(6)]],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      rol: ['user', Validators.required],
      matricula: [''],
      grupo: ['']
    });

    // Manejo dinámico de campos según el rol
    this.userForm.get('rol')?.valueChanges.subscribe((rol) => {
      if (rol === 'user') {
        this.userForm.get('matricula')?.setValidators([Validators.required]);
        this.userForm.get('grupo')?.setValidators([Validators.required]);
      } else {
        this.userForm.get('matricula')?.clearValidators();
        this.userForm.get('grupo')?.clearValidators();
        this.userForm.get('matricula')?.setValue('');
        this.userForm.get('grupo')?.setValue('');
      }
      this.userForm.get('matricula')?.updateValueAndValidity();
      this.userForm.get('grupo')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: any) {
    this.selectedFiles = Array.from(event.target.files);
    if (this.selectedFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
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
      spinner: 'circles',
      duration: 15000
    });
    await loading.present();

    const rol = this.userForm.value.rol as 'user' | 'admin';

    if (rol === 'user') {
      const formData = new FormData();
      formData.append('name', this.userForm.value.name);
      formData.append('email', this.userForm.value.email);
      formData.append('password', this.userForm.value.password);
      formData.append('tel', this.userForm.value.tel);
      formData.append('rol', rol);
      formData.append('matricula', this.userForm.value.matricula);
      formData.append('grupo', this.userForm.value.grupo);

      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach(file => {
          formData.append('files', file, file.name);
        });
      }

      this.userService.createUser(formData).subscribe({
        next: async () => {
          await loading.dismiss();
          this.presentToast('Usuario registrado correctamente.', 'success');
          this.resetForm();
        },
        error: async (err: HttpErrorResponse) => {
          await loading.dismiss();
          this.handleError(err);
        }
      });

    } else if (rol === 'admin') {
      const adminData: Partial<Usuario> & { password: string } = {
        name: this.userForm.value.name,
        email: this.userForm.value.email,
        password: this.userForm.value.password,
        tel: Number(this.userForm.value.tel),
        rol: 'admin'
      };

      this.userService.registerAdmin(adminData).subscribe({
        next: async () => {
          await loading.dismiss();
          this.presentToast('Administrador registrado correctamente.', 'success');
          this.resetForm();
        },
        error: async (err: HttpErrorResponse) => {
          await loading.dismiss();
          this.handleError(err);
        }
      });
    } else {
      await loading.dismiss();
      this.presentToast('Rol inválido.', 'danger');
    }
  }

  private handleError(err: HttpErrorResponse) {
    console.error('Error en el registro:', err);
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

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  resetForm() {
    this.userForm.reset({ rol: 'user' });
    this.selectedFiles = [];
    this.imagePreview = null;
    this.router.navigate(['/tabs-Admin/tab5']);
  }
}
