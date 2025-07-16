import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab4AdminPage } from './tab4-admin.page';

describe('Tab4AdminPage', () => {
  let component: Tab4AdminPage;
  let fixture: ComponentFixture<Tab4AdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab4AdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
