import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonBadge,
  IonCardContent, IonCardSubtitle, IonCardHeader, IonCardTitle, IonImg, IonCard,
  IonCol, IonButton, IonIcon, IonItem, IonSelectOption, IonLabel, IonText,
  IonFab, IonFabButton, IonSearchbar, IonSelect
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { InventarioService } from '../services/inventario.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ellipsisVerticalOutline, trashOutline, filter, createOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab3-admin',
  templateUrl: './tab3-admin.page.html',
  styleUrls: ['./tab3-admin.page.scss'],
  standalone: true,
  imports: [
    IonSearchbar, IonSelect, IonText, IonLabel, IonItem, IonIcon, IonButton, IonCol,
    IonCard, IonContent, IonImg, IonCardTitle, IonCardHeader, IonCardSubtitle,
    IonCardContent, IonBadge, IonRow, IonGrid, CommonModule, FormsModule,
    IonSelectOption, ReactiveFormsModule
  ]
})
export class Tab3AdminPage implements OnInit {
  @ViewChild('categoriaSelect', { static: false }) categoriaSelect!: IonSelect;

  equipos: any[] = [];
  equiposOriginales: any[] = [];

  searchTerm = '';
  estadoSeleccionado = '';
  categoriaSeleccionada = '';

  categorias = [
    'Herramientas',
    'Proyectores',
    'Mecánica',
    'Componentes',
    'Laboratorio',
    'Instrumento de medicion'
  ];

  private inventarioService = inject(InventarioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    addIcons({ filter, trashOutline, ellipsisVerticalOutline, createOutline });
  }

  ngOnInit() {
    this.obtenerEquipos();
  }



  obtenerEquipos() {
    this.inventarioService.Equipos().subscribe({
      next: (res) => {
        this.equiposOriginales = res;
        this.aplicarFiltros();
        console.log('Equipos cargados:', this.equipos);
      },
      error: (err) => {
        console.error('Error al obtener los equipos:', err);
      }
    });
  }

    buscarEquipos(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }


  aplicarFiltros() {
    let equiposFiltrados = [...this.equiposOriginales];

    // Filtro por categoría
    if (this.categoriaSeleccionada) {
      equiposFiltrados = equiposFiltrados.filter(
        e => e.categoria?.toLowerCase() === this.categoriaSeleccionada.toLowerCase()
      );
    }

    // Filtro por estado
    if (this.estadoSeleccionado) {
      equiposFiltrados = equiposFiltrados.filter(
        e => e.estado?.toLowerCase() === this.estadoSeleccionado.toLowerCase()
      );
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      equiposFiltrados = equiposFiltrados.filter(e =>
        e.name?.toLowerCase().includes(this.searchTerm) ||
        e.description?.toLowerCase().includes(this.searchTerm) ||
        e.model?.toLowerCase().includes(this.searchTerm) ||
        e.nseries?.toLowerCase().includes(this.searchTerm)
      );
    }

    this.equipos = equiposFiltrados;
  }

  limpiarFiltros() {
    this.categoriaSeleccionada = '';
    this.estadoSeleccionado = '';
    this.searchTerm = '';
    this.equipos = [...this.equiposOriginales];
  }

  filtrarPorCategoria() {
    this.aplicarFiltros();
  }

  filtrarPorEstado() {
    this.aplicarFiltros();
  }


  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Ocupado': return 'warning';
      case 'En Mantenimiento': return 'danger';
      default: return 'medium';
    }
  }

  editarMaterial(id: string) {
    this.router.navigate(['/tabs-Admin/edit-material', id]);
  }

  eliminarEquipo(id: string) {
    if (!id) return;

    if (confirm('¿Seguro que deseas eliminar este equipo?')) {
      this.inventarioService.eliminarEquipo(id).subscribe({
        next: () => {
          console.log('Equipo eliminado:', id);
          this.equipos = this.equipos.filter(e => e._id !== id);
          this.equiposOriginales = this.equiposOriginales.filter(e => e._id !== id);
        },
        error: (err) => {
          console.error('Error al eliminar el equipo:', err);
          alert('Error al eliminar el equipo. Intente de nuevo.');
        }
      });
    }
  }

  imprimirQR(qrUrl: string) {
    if (!qrUrl) {
      alert('No hay QR disponible para imprimir.');
      return;
    }

    const ventana = window.open('', '_blank', 'width=400,height=400');
    if (!ventana) {
      alert('Por favor permite las ventanas emergentes para imprimir.');
      return;
    }

    ventana.document.write(`
      <html>
        <head>
          <title>Imprimir QR</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            img { max-width: 80%; max-height: 80%; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <img src="${qrUrl}" alt="QR del equipo" />
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  verDetalles(id: string) {
    console.log('Equipo seleccionado:', id);
    this.router.navigate(['/reserva'], { queryParams: { id } });
  }
}
