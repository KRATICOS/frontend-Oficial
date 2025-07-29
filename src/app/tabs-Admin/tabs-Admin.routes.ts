import { Routes } from '@angular/router';
import { TabsAdminPage } from './tabs-Admin.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsAdminPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../tab-admin/tab-admin.page').then((m) => m.TabAdminPage),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2-admin/tab2-admin.page').then((m) => m.Tab2AdminPage),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../tab3-admin/tab3-admin.page').then((m) => m.Tab3AdminPage),
      },
      {
        path: 'tab4',
        loadComponent: () =>
          import('../tab4-admin/tab4-admin.page').then((m) => m.Tab4AdminPage),
      },
      {
        path: 'tab5',
        loadComponent: () =>
          import('../tab5-admin/tab5-admin.page').then((m) => m.Tab5AdminPage),
      },
        {
    path: 'addAdmin',
    loadComponent: () => import('../addadmin/addadmin.page').then( m => m.AddadminPage)
  },
{ path: 'edit-material/:id', loadComponent: () => import('../edit-material/edit-material.page').then(m => m.EditMaterialPage) },
      {
        path: '',
        redirectTo: '/login',  
        pathMatch: 'full',
      },
    ],
  }
];
