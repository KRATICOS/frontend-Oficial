import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab2AdminPage } from './tab2-admin.page';

describe('Tab2AdminPage', () => {
  let component: Tab2AdminPage;
  let fixture: ComponentFixture<Tab2AdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab2AdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
