import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonBadge,
  IonCardContent, IonCardSubtitle, IonCardHeader, IonCardTitle, IonImg, IonCard,
  IonCol, IonButton, IonIcon, IonItem, IonSelectOption, IonLabel, IonText,
  IonFab, IonFabButton, IonSearchbar, IonSelect
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { Inventario } from '../interface';
import { addIcons } from 'ionicons';
import { InventarioService } from '../services/inventario.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ellipsisVerticalOutline, trashOutline, filter, createOutline, lockClosed, lockOpen } from 'ionicons/icons';

@Component({
  selector: 'app-tab3-admin',
  templateUrl: './tab3-admin.page.html',
  styleUrls: ['./tab3-admin.page.scss'],
  standalone: true,
  imports: [
    IonSearchbar, IonSelect, IonText, IonItem, IonIcon, IonButton, IonCol,
    IonCard, IonContent, IonImg, IonCardTitle, IonCardHeader, IonCardSubtitle,
    IonCardContent, IonBadge, IonRow, IonGrid, CommonModule, FormsModule,
    IonSelectOption, ReactiveFormsModule
  ]
})
export class Tab3AdminPage implements OnInit {
  @ViewChild('categoriaSelect', { static: false }) categoriaSelect!: IonSelect;

  equipos: any[] = [];
   equiposOriginales: Inventario[] = []; 

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
      addIcons({ filter, trashOutline, ellipsisVerticalOutline, createOutline, lockClosed, lockOpen });
}

  ngOnInit() {
    this.obtenerEquipos();
  }



 obtenerEquipos() {
    this.inventarioService.Equipos().subscribe({
      next: (res: Inventario[]) => {
        const equiposBloqueadosStr = localStorage.getItem('equiposBloqueados');
        const equiposBloqueados: Record<string, boolean> = equiposBloqueadosStr ? JSON.parse(equiposBloqueadosStr) : {};
        
        this.equiposOriginales = res.map(equipo => {
          if (equipo._id && equiposBloqueados[equipo._id] !== undefined) {
            equipo.reservaBloqueada = equiposBloqueados[equipo._id];
          }
          return equipo;
        });
        
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



async toggleBloqueoReserva(equipo: Inventario) {
    try {
      if (!equipo._id) throw new Error('ID del equipo no definido');
      
      const nuevoEstado = !equipo.reservaBloqueada;
      
      // 1. Actualizar en la base de datos
      await firstValueFrom(
        this.inventarioService.actualizarEstadoBloqueo(equipo._id, nuevoEstado)
      );
      
      // 2. Actualizar en el estado local
      equipo.reservaBloqueada = nuevoEstado;
      
      // 3. Actualizar en el array original
      const index = this.equiposOriginales.findIndex(e => e._id === equipo._id);
      if (index !== -1) {
        this.equiposOriginales[index].reservaBloqueada = nuevoEstado;
      }
      
      // 4. Actualizar en localStorage
      const equiposBloqueadosStr = localStorage.getItem('equiposBloqueados');
      const equiposBloqueados: Record<string, boolean> = equiposBloqueadosStr ? JSON.parse(equiposBloqueadosStr) : {};
      equiposBloqueados[equipo._id] = nuevoEstado;
      localStorage.setItem('equiposBloqueados', JSON.stringify(equiposBloqueados));
      
      const mensaje = nuevoEstado 
        ? 'Reservas bloqueadas para este equipo' 
        : 'Reservas habilitadas para este equipo';
      alert(mensaje);
    } catch (error) {
      console.error('Error al actualizar estado de bloqueo:', error);
      alert('Error al actualizar estado de bloqueo');
    }
  }
  

  verDetalles(id: string) {
    console.log('Equipo seleccionado:', id);
    this.router.navigate(['/reserva'], { queryParams: { id } });
  }
}
