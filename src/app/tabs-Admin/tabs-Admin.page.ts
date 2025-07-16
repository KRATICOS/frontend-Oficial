import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, filterCircleOutline, qrCodeOutline, personCircleOutline ,gridOutline, refreshOutline, fileTraySharp, eyeOutline, timeOutline, createOutline} from 'ionicons/icons';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-tabs-Admin',
  templateUrl: 'tabs-Admin.page.html',
  styleUrls: ['tabs-Admin.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, FormsModule],
})
export class TabsAdminPage {
  public environmentInjector = inject(EnvironmentInjector);
  selectedTab: string = 'tab1';


    onTabChange(event: any) {
    console.log('Tab changed:', event);
  }
  constructor() {
    addIcons({ triangle, ellipse, square, filterCircleOutline, qrCodeOutline, personCircleOutline,eyeOutline,timeOutline,createOutline});
  }
}
