import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-no-autorizado',
  templateUrl: './no-autorizado.page.html',
  styleUrls: ['./no-autorizado.page.scss'],
  imports: [IonicModule, CommonModule],
})
export class NoAutorizadoPage {
  constructor(private router: Router) {}

  volver() {
    this.router.navigate(['/login']);
  }
}
