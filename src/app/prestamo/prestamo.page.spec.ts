import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrestamoPage } from './prestamo.page';

describe('PrestamoPage', () => {
  let component: PrestamoPage;
  let fixture: ComponentFixture<PrestamoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PrestamoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
