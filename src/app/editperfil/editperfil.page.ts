import { Component, OnInit, inject } from '@angular/core';
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
import { cameraOutline, checkmarkCircle, closeCircle, construct, imageOutline, navigate, save, trash } from 'ionicons/icons';


addIcons({
  checkmarkCircle,
  closeCircle,
  construct,
  cameraOutline, imageOutline // nuevo ícono agregado
});


@Component({
  selector: 'app-edit-profile',
  templateUrl: './editperfil.page.html',
  styleUrls: ['./editperfil.page.scss'],
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
    IonBackButton,
    IonButtons,
  ],
})
export class EditperfilPage implements OnInit {
  userForm!: FormGroup;
  selectedFiles: File[] = [];
  userId!: string;
  previewImage: string | null = null; // Simplificado a solo string
  currentUser!: Usuario;
  isAdmin: boolean = false;

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
    this.loadUser();
  }

  initForm() {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      tel: [''],
      matricula: [''],
      grupo: [''],
      rol: [{ value: this.currentUser.rol, disabled: true }]
    });

    if (!this.isAdmin) {
      this.userForm.get('tel')?.setValidators([Validators.required]);
      this.userForm.get('matricula')?.setValidators([Validators.required]);
      this.userForm.get('grupo')?.setValidators([Validators.required]);
    }
  }

  loadUser() {
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          tel: user.tel,
          matricula: user.matricula,
          grupo: user.grupo,
          rol: user.rol
        });

        if (user.imagen) {
          if (Array.isArray(user.imagen) && user.imagen.length > 0) {
            this.previewImage = user.imagen[0];
          } else if (typeof user.imagen === 'string') {
            this.previewImage = user.imagen;
          } else {
            this.previewImage = null;
          }
        } else {
          this.previewImage = null;
        }
      },
      error: (err) => console.error(err),
    });
  }

  clearForm() {
    this.userForm.reset({
      rol: this.currentUser.rol
    });

    if (this.currentUser.imagen) {
      if (Array.isArray(this.currentUser.imagen) && this.currentUser.imagen.length > 0) {
        this.previewImage = this.currentUser.imagen[0];
      } else if (typeof this.currentUser.imagen === 'string') {
        this.previewImage = this.currentUser.imagen;
      } else {
        this.previewImage = null;
      }
    } else {
      this.previewImage = null;
    }

    this.selectedFiles = [];
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles = [file];
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
      };
      reader.readAsDataURL(file);
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

    let requestObservable;

    if (this.selectedFiles.length > 0) {
      const formData = new FormData();
      Object.keys(updateData).forEach(key => formData.append(key, updateData[key]));

      this.selectedFiles.forEach(file => formData.append('files', file));

      requestObservable = this.serviceService.updateUser(this.userId, formData, true); // <-- true = multipart
    } else {
      requestObservable = this.serviceService.updateUser(this.userId, updateData); // <-- JSON plano
    }

    requestObservable.subscribe({
      next: async (response) => {
        const updatedUser = response.user || response;

        const currentUserData = JSON.parse(localStorage.getItem('User') || '{}');
        const mergedData = { ...currentUserData, ...updatedUser };

        localStorage.setItem('User', JSON.stringify(mergedData));

        const toast = await this.toastController.create({
          message: 'Perfil actualizado correctamente',
          duration: 2000,
          color: 'success',
        });
 
        toast.present();
        this.redireccionarPorRol(updatedUser.rol);

      },
      error: async (error) => {
        console.error('Error al actualizar perfil:', error);
        const toast = await this.toastController.create({
          message: 'Error al actualizar el perfil',
          duration: 2000,
          color: 'danger',
        });
        toast.present();
      }
    });
  }


  redireccionarPorRol(rol: string) {
  if (rol === 'admin') {
    this.router.navigate(['/tabs-Admin/tab5']);
  } else {
    this.router.navigate(['/tabs/tab3']);
  }
}


  cancel() {
    this.router.navigate(['/tabs/tab3']);
  }
}