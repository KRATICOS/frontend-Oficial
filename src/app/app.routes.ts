import { Routes } from '@angular/router';



export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage)
  },
  {
    path: 'tabs-Admin',
    loadChildren: () => import('./tabs-Admin/tabs-Admin.routes').then(m => m.routes),
  },
  {
    path: 'reserva',
    loadComponent: () => import('./reserva/reserva.page').then(m => m.ReservaPage)
  },
  {
    path: 'prestamo',
    loadComponent: () => import('./prestamo/prestamo.page').then(m => m.PrestamoPage)
  },
  {
    path: 'editperfil',
    loadComponent: () => import('./editperfil/editperfil.page').then(m => m.EditperfilPage)
  },
  {
    path: 'addAdmin',
    loadComponent: () => import('./addadmin/addadmin.page').then(m => m.AddadminPage)
  },
  { path: 'edit-material/:id', loadComponent: () => import('./edit-material/edit-material.page').then(m => m.EditMaterialPage) }
  , {
    path: 'edit-material/:id',
    loadComponent: () => import('./edit-material/edit-material.page').then(m => m.EditMaterialPage)
  }

];
