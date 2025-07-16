import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab5AdminPage } from './tab5-admin.page';

describe('Tab5AdminPage', () => {
  let component: Tab5AdminPage;
  let fixture: ComponentFixture<Tab5AdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab5AdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
