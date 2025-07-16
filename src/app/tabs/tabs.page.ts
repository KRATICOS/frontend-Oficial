import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, filterCircleOutline, qrCodeOutline, personCircleOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { Route, Router } from '@angular/router';


@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, FormsModule,IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  selectedTab: string = 'tab1';


  onTabChange(event: any) {
    const selectedTab = event.tab;

    if (selectedTab === 'tab2') {
      this.router.navigateByUrl('/tabs/tab2', { replaceUrl: true });
    }
  }

  constructor(private router: Router) {
    addIcons({ triangle, ellipse, square, filterCircleOutline, qrCodeOutline, personCircleOutline});
  }
}
