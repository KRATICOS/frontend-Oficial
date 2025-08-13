import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCardContent, IonCardTitle,
  IonCardHeader, IonCard, IonButton, IonAvatar, IonButtons, IonIcon,
  IonCardSubtitle, IonBadge, IonList, IonItem, IonLabel
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { NotificacionesAdminComponent } from '../components/notificaciones-admin/notificaciones-admin.component';
import { ServiceService } from '../services/service.service';
import { HistorialService } from '../services/historial.service';
import { Usuario } from '../interface';
import { Router } from '@angular/router';
import { NotificationService, NotificacionReserva } from '../services/notification.service';
import { addIcons } from 'ionicons';
import * as XLSX from 'xlsx';
import { ToastController, LoadingController } from '@ionic/angular/standalone';
import * as bcrypt from 'bcryptjs';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  checkmarkCircle,
  closeCircle,
  construct,
  notificationsOutline,
  mailOutline,
  logOutOutline,
  arrowForwardOutline,
  createOutline,
  documentAttachOutline
} from 'ionicons/icons';

interface Estudiante {
  name: string;
  email: string;
  matricula: string;
  grupo: string;
  password: string;
  tel?: string;
}

addIcons({
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'construct-outline': construct,
  'notifications-outline': notificationsOutline,
  'mail-outline': mailOutline,
  'log-out-outline': logOutOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'create-outline': createOutline,
  'document-attach-outline': documentAttachOutline
});

@Component({
  selector: 'app-tab5-admin',
  templateUrl: './tab5-admin.page.html',
  styleUrls: ['./tab5-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
    IonButton, IonAvatar, IonButtons, IonIcon, IonBadge,
  ]
})
export class Tab5AdminPage implements OnInit {
  usuario: Partial<Usuario> = { name: '', email: '' };
  notificaciones: NotificacionReserva[] = [];
  selectedFile: File | null = null;
  showUploadOption: boolean = false;

  private _serviceService = inject(ServiceService);
  private notificationService = inject(NotificationService);
  private _historialService = inject(HistorialService);
  private _router = inject(Router);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  async ngOnInit(): Promise<void> {
    await this.cargarUsuario();
    this.subscribirNotificaciones();
  }

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
        imagen: parsed.imagen || (parsed.imagenes?.[0]?.url || '')
      };
    }
  }

  subscribirNotificaciones(): void {
    this.notificationService.notificaciones$.subscribe({
      next: (nots) => {
        this.notificaciones = nots.filter(n => n.estado === 'Pendiente');
      },
      error: (err) => console.error('Error en notificaciones:', err)
    });
  }

  async abrirModalNotificaciones(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NotificacionesAdminComponent,
      componentProps: { notificaciones: this.notificaciones },
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8
    });
    
    await modal.present();
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

  actualizarPerfil(): void {
    this._router.navigate(['/editperfil']);
  }

  addAdm(): void {
    this._router.navigate(['/addAdmin']);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('User');
    this._router.navigate(['/login']);
  }

  toggleUploadOption(): void {
    this.showUploadOption = !this.showUploadOption;
    if (!this.showUploadOption) {
      this.resetUpload();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(fileExtension)) {
        this.selectedFile = file;
        this.presentToast('Archivo seleccionado: ' + file.name, 'success');
      } else {
        this.selectedFile = null;
        this.presentToast('Por favor, selecciona un archivo Excel válido (.xlsx, .xls, .csv)', 'danger');
      }
    }
  }

async processExcelFile(): Promise<void> {
  if (!this.selectedFile) {
    this.presentToast('No se ha seleccionado ningún archivo', 'warning');
    return;
  }

  const loading = await this.loadingCtrl.create({
    message: 'Procesando archivo Excel...',
    spinner: 'circles'
  });
  
  await loading.present();

  try {
    const data = await this.readExcelFile(this.selectedFile);
    const students = await this.parseExcelData(data);
    
    if (students.length === 0) {
      this.presentToast('No se encontraron estudiantes válidos en el archivo', 'warning');
      return;
    }

    const result = await this._serviceService.registrarEstudiantesMasivo(students).toPromise();
    
    // <-- Aquí haces el cambio
    const resultados = Array.isArray(result) ? result : result?.resultados || [];
    this.handleRegistrationResults(resultados, students.length);
    
  } catch (error: unknown) {
    this.handleProcessError(error);
  } finally {
    await loading.dismiss();
    this.resetUpload();
  }
}


private handleRegistrationResults(results: (Usuario | { error: any })[], total: number): void {
  if (!Array.isArray(results)) {
    console.error('Resultados inválidos:', results);
    this.presentToast('Error: formato de resultados no válido.', 'danger', 5000);
    return;
  }

  const successCount = results.filter(r => !this.isErrorResponse(r)).length;

  const duplicatedCount = results.filter(r =>
    this.isErrorResponse(r) &&
    r.error?.message?.toLowerCase().includes('ya está registrado')
  ).length;

  const otherErrorsCount = total - successCount - duplicatedCount;

  if (otherErrorsCount > 0) {
    this.presentToast(
      `${successCount} usuario(s) registrado(s) correctamente. ${otherErrorsCount} usuarios duplicados.`,
      'warning',
      5000
    );
  } else {
    this.presentToast(
      `${successCount} usuario(s) registrado(s) correctamente.`,
      'success'
    );
  }
}





  private isErrorResponse(obj: any): obj is {error: any} {
    return obj && obj.error;
  }

  private handleProcessError(error: unknown): void {
    console.error('Error procesando archivo:', error);
    
    let errorMessage = 'Error al procesar el archivo';
    
    if (error instanceof HttpErrorResponse) {
      errorMessage = this.getServerErrorMessage(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    this.presentToast(errorMessage, 'danger', 5000);
  }

  private getServerErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0: return 'No se pudo conectar al servidor';
      case 400: return 'Datos inválidos enviados al servidor';
      case 401: return 'No autorizado. Por favor inicia sesión nuevamente';
      case 403: return 'No tienes permisos para realizar esta acción';
      case 404: return 'Recurso no encontrado en el servidor';
      case 409: return 'Conflicto: Algunos usuarios ya existen';
      case 413: return 'Los datos enviados son demasiado grandes';
      case 500: return 'Error interno del servidor';
      default: return `Error del servidor: ${error.status}`;
    }
  }

  private readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          resolve(XLSX.utils.sheet_to_json(worksheet));
        } catch (error) {
          reject(new Error('Formato de archivo inválido'));
        }
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async parseExcelData(data: any[]): Promise<Estudiante[]> {
    const salt = await bcrypt.genSalt(10);
    const students: Estudiante[] = [];
    
    for (const [index, row] of data.entries()) {
      try {
        const rowLower = Object.keys(row).reduce((acc, key) => {
          acc[key.toLowerCase()] = row[key];
          return acc;
        }, {} as any);

        const matricula = rowLower['matrícula'] || rowLower['matricula'] || '';
        const nombre = rowLower['nombre'] || rowLower['name'] || '';
        const email = (rowLower['correo'] || rowLower['email'] || '').toString().toLowerCase().trim();
        const grupo = (rowLower['grupo'] || '').toString().trim();
        const telefono = (rowLower['telefono'] || '').toString().trim();

        if (!matricula || !nombre || !email) {
          console.warn(`Fila ${index + 1} omitida: faltan datos requeridos`);
          continue;
        }

        if (!this.isValidEmail(email)) {
          console.warn(`Fila ${index + 1} omitida: email inválido`);
          continue;
        }

        students.push({
          name: nombre.toString().trim(),
          email,
          matricula: matricula.toString().trim(),
          grupo: grupo || 'SIN GRUPO',
          password: matricula.toString().trim(),
          tel: telefono.toString().trim(), // Teléfono por defecto
        });
      } catch (error) {
        console.error(`Error procesando fila ${index + 1}:`, error);
      }
    }
    
    return students;
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private resetUpload(): void {
    this.selectedFile = null;
    this.showUploadOption = false;
    const fileInput = document.getElementById('excelUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  async presentToast(message: string, color: string, duration: number = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'top'
    });
    await toast.present();
  }
}