

export interface Imagen {
  url: string;
  _id?: string;
}

export interface Inventario {
  _id?: string;
  name: string;
  model: string;
  description: string;
  estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento';
  categoria: string;
  imagenes: Imagen[];
  nseries: string;
  codigoQR?: string;
}


export interface Usuario {
    _id: string;
    name: string;
    email: string;
    tel: number;
    rol: 'superadmin' | 'admin' | 'user';
    matricula?: string;
    grupo?: string;
    imagen?:string[]
}

export interface Registro {
  _id: string;
  inventarioId: string | Inventario;
  usuarioId: string | Usuario;
  fechaPrestamo: string;
  fechaDevolucion?: string;
  horaSolicitud: string;
  horaDevolucion?: string;
  estado: 'Disponible' | 'Ocupado' | 'En Mantenimiento';
  observaciones?: string;
  tipoPrestamo?: 'qr' | 'manual' | 'reserva';
}

