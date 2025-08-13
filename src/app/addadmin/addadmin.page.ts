import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn 
} from '@angular/forms';
import {
  IonCheckbox,
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
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonFooter,
  IonButtons,
  IonChip,
  IonSearchbar,
  AlertController, 
  IonText, 
  IonGrid, 
  IonRow, 
  IonCol 
} from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { Usuario } from 'src/app/interface';
import { addIcons } from 'ionicons';
import { cameraOutline, imageOutline, trash } from 'ionicons/icons';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-addadmin',
  templateUrl: './addadmin.page.html',
  styleUrls: ['./addadmin.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonCheckbox,
    IonChip,
    IonButtons,
    IonFooter,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonList,
    IonCardContent,
    IonCardTitle,
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
    IonIcon,
    IonSearchbar,
    IonText
  ]
})
export class AddadminPage implements OnInit {
  iconos: string[] = [
    'add', 'albums', 'alert-circle', 'arrow-forward-outline', 'barcode', 'calendar',
    'call-outline', 'camera-outline', 'checkmark', 'checkmark-circle', 'close', 'close-circle',
    'construct', 'create-outline', 'cube', 'document-attach-outline', 'ellipsis-vertical-outline',
    'eye-outline', 'filter', 'id-card-outline', 'image-outline', 'keypad', 'lock-closed',
    'lock-open', 'log-out-outline', 'mail-outline', 'notifications', 'notifications-off',
    'notifications-outline', 'people-outline', 'person-outline', 'pricetag', 'qr-code',
    'reader', 'return-down-back', 'save', 'search', 'time', 'trash', 'trash-outline', 'warning'
  ];
  
  currentUser!: Usuario;
  userForm: FormGroup;
  selectedFiles: File[] = [];
  imagePreview: string | ArrayBuffer | null = null;
  showPassword: boolean = false;
  passwordFieldType: string = 'password';
  // Gestión de usuarios
  allUsers: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  uniqueGroups: string[] = [];
  selectedGroup: string = '';
  searchTerm: string = '';
  selectedUsers: { [key: string]: boolean } = {};
  selectedCount: number = 0;
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalUsers: number = 0;
  totalPages: number = 1;

  private fb = inject(FormBuilder);
  private userService = inject(ServiceService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  constructor() {
    addIcons({ cameraOutline, imageOutline, trash });
    
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)]],
      email: ['', [
        Validators.required, 
        Validators.email,
        this.emailInstitucionalValidator()
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        this.passwordStrengthValidator()
      ]],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      rol: ['user', Validators.required],
      matricula: [''],
      grupo: ['']
    });

    // Escuchar cambios en matrícula para revalidar email
    this.userForm.get('matricula')?.valueChanges.subscribe(() => {
      this.userForm.get('email')?.updateValueAndValidity();
    });

    this.userForm.get('rol')?.valueChanges.subscribe((rol) => {
      if (rol === 'user') {
        this.userForm.get('matricula')?.setValidators([
          Validators.required,
          Validators.pattern(/^[A-Za-z0-9]+$/)
        ]);
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

  cancel() {
    this.router.navigate(['/tabs-Admin/tab5']);

}

   togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.passwordFieldType = this.showPassword ? 'text' : 'password';
  }


  // Validador personalizado para correo institucional (actualizado)
  private emailInstitucionalValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value;
      const matriculaControl = control.parent?.get('matricula');
      
      if (!email || !matriculaControl) {
        return null;
      }

      // Validar dominio
      const dominioValido = email.endsWith('@utvco.edu.mx');
      if (!dominioValido) {
        return { dominioInvalido: true };
      }

      // Validar coincidencia con matrícula (solo si el rol es 'user')
      if (this.userForm?.get('rol')?.value === 'user') {
        const nombreUsuario = email.split('@')[0];
        const matricula = matriculaControl.value;
        
        if (nombreUsuario !== matricula) {
          return { matriculaNoCoincide: true };
        }
      }

      return null;
    };
  }

  // Validador para fuerza de contraseña
  private passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      
      const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
      return valid ? null : { passwordWeak: true };
    };
  }

  ngOnInit(): void {
    this.loadUsers();
  }

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
      this.validarFormulario();
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
          this.cancel();
          this.loadUsers();
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
          this.cancel();
          this.loadUsers();
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

  private validarFormulario() {
    const emailErrors = this.userForm.get('email')?.errors;
    
    if (emailErrors) {
      if (emailErrors['dominioInvalido']) {
        this.presentToast('El correo debe tener el dominio @utvco.edu.mx', 'warning');
      } else if (emailErrors['matriculaNoCoincide']) {
        this.presentToast('El nombre de usuario del correo debe coincidir con la matrícula', 'warning');
      } else if (emailErrors['email']) {
        this.presentToast('Por favor ingresa un correo electrónico válido', 'warning');
      } else {
        this.presentToast('Por favor, completa todos los campos correctamente.', 'warning');
      }
    } else {
      this.presentToast('Por favor, completa todos los campos correctamente.', 'warning');
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



  async loadUsers() {
    const loading = await this.loadingController.create({
      message: 'Cargando usuarios...',
      spinner: 'circles'
    });
    await loading.present();

    this.userService.getUsers().subscribe({
      next: (response) => {
        this.allUsers = response.docs;
        this.totalUsers = response.totalDocs;
        this.totalPages = Math.ceil(this.totalUsers / this.itemsPerPage);
        
        this.uniqueGroups = [...new Set(
          this.allUsers
            .filter(user => user.grupo)
            .map(user => user.grupo as string)
        )].sort();
        
        this.applyFilters();
        loading.dismiss();
      },
      error: async (err) => {
        loading.dismiss();
        this.presentToast('Error al cargar usuarios', 'danger');
        console.error(err);
      }
    });
  }

  applyFilters() {
    let filtered = [...this.allUsers];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term) ||
        (user.matricula && user.matricula.toLowerCase().includes(term))
      );
    }
    
    if (this.selectedGroup) {
      filtered = filtered.filter(user => user.grupo === this.selectedGroup);
    }
    
    this.filteredUsers = filtered.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
    
    this.totalUsers = filtered.length;
    this.totalPages = Math.ceil(this.totalUsers / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
    }
  }

  updateSelectedCount() {
    this.selectedCount = Object.values(this.selectedUsers).filter(Boolean).length;
  }

  async confirmDeleteUser(userId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => this.deleteUser(userId)
        }
      ]
    });
    
    await alert.present();
  }

  async confirmBulkDelete() {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar los ${this.selectedCount} usuarios seleccionados?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => this.deleteSelectedUsers()
        }
      ]
    });
    
    await alert.present();
  }

  async deleteUser(userId: string) {
    const loading = await this.loadingController.create({
      message: 'Eliminando usuario...',
      spinner: 'circles'
    });
    await loading.present();

    this.userService.deleteUser(userId).subscribe({
      next: async () => {
        loading.dismiss();
        this.presentToast('Usuario eliminado correctamente', 'success');
        this.loadUsers();
        this.selectedUsers[userId] = false;
        this.updateSelectedCount();
      },
      error: async (err) => {
        loading.dismiss();
        this.presentToast('Error al eliminar usuario', 'danger');
        console.error(err);
      }
    });
  }

  async deleteSelectedUsers() {
    const userIds = Object.keys(this.selectedUsers).filter(id => this.selectedUsers[id]);
    if (userIds.length === 0) return;

    const loading = await this.loadingController.create({
      message: `Eliminando ${userIds.length} usuarios...`,
      spinner: 'circles'
    });
    await loading.present();

    const deleteOperations = userIds.map(id => this.userService.deleteUser(id));
    
    forkJoin(deleteOperations).subscribe({
      next: async () => {
        loading.dismiss();
        this.presentToast(`${userIds.length} usuarios eliminados correctamente`, 'success');
        this.selectedUsers = {};
        this.selectedCount = 0;
        this.loadUsers();
      },
      error: async (err) => {
        loading.dismiss();
        this.presentToast('Error al eliminar algunos usuarios', 'danger');
        console.error(err);
        this.loadUsers();
      }
    });
  }
}