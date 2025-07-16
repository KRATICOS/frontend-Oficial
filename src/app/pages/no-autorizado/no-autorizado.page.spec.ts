import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoAutorizadoPage } from './no-autorizado.page';

describe('NoAutorizadoPage', () => {
  let component: NoAutorizadoPage;
  let fixture: ComponentFixture<NoAutorizadoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NoAutorizadoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
