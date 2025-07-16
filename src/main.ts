import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular
} from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, construct } from 'ionicons/icons';
// Este import es correcto, pero no se debe poner en providers
import { LocalNotifications } from '@capacitor/local-notifications';
import { authInterceptor } from './app/interceptors/auth.interceptor';

import { enableProdMode, importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';

addIcons({
  checkmarkCircle,
  closeCircle,
  construct
});

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(), // Configura Ionic para Angular standalone
    provideRouter(routes, withPreloading(PreloadAllModules)), // Configura el router con precarga
    provideHttpClient(withInterceptors([authInterceptor])),

    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } // Estrategia de reutilización de rutas para Ionic
  ]

});
