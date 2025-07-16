import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-prestamo',
  templateUrl: './prestamo.page.html',
  styleUrls: ['./prestamo.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class PrestamoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
