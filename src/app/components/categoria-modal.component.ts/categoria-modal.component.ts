import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonInput, IonList, IonItem, IonLabel, IonIcon, ModalController, ToastController } from '@ionic/angular/standalone';
import { InventarioService } from 'src/app/services/inventario.service';
import { closeCircle } from 'ionicons/icons';

@Component({
  selector: 'app-categoria-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonInput, IonList, IonItem, IonLabel, IonIcon],
  template: `
  <div class="ion-padding">
    <h2>Gestionar Categorías</h2>

    <ion-item>
      <ion-input [(ngModel)]="nuevaCategoria" placeholder="Nueva categoría"></ion-input>
    </ion-item>
    <ion-button expand="block" (click)="agregarCategoria()">Agregar</ion-button>

    <ion-list *ngIf="categorias.length > 0">
      <ion-item *ngFor="let cat of categorias">
        <ion-label>{{ cat }}</ion-label>
        <ion-icon name="close-circle" color="danger" (click)="eliminarCategoria(cat)"></ion-icon>
      </ion-item>
    </ion-list>

    <ion-button expand="block" fill="outline" color="medium" (click)="cerrar()">Cerrar</ion-button>
  </div>
  `
})
export class CategoriaModalComponent {
  inventarioService = inject(InventarioService);
  toastController = inject(ToastController);
  modalCtrl = inject(ModalController);

  nuevaCategoria = '';
  categorias: string[] = [];

  ngOnInit() {
    this.cargarCategorias();
  }

  async cargarCategorias() {
    this.inventarioService.obtenerCategorias().subscribe((data: string[]) => {
      this.categorias = data;
    });
  }

  agregarCategoria() {
    const nombre = this.nuevaCategoria.trim();
    if (!nombre) return;

    this.inventarioService.crearCategoria(nombre).subscribe({
      next: () => {
        this.presentToast('Categoría agregada', 'success');
        this.nuevaCategoria = '';
        this.cargarCategorias();
      },
      error: () => this.presentToast('Error al agregar', 'danger')
    });
  }

  eliminarCategoria(nombre: string) {
    this.inventarioService.eliminarCategoria(nombre).subscribe({
      next: () => {
        this.presentToast('Categoría eliminada', 'warning');
        this.cargarCategorias();
      },
      error: () => this.presentToast('Error al eliminar', 'danger')
    });
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({ message, duration: 1500, color });
    await toast.present();
  }
}
