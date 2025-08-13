import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3AdminPage } from './tab3-admin.page';

describe('Tab3AdminPage', () => {
  let component: Tab3AdminPage;
  let fixture: ComponentFixture<Tab3AdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab3AdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
