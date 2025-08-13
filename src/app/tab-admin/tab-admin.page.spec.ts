import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabAdminPage } from './tab-admin.page';

describe('TabAdminPage', () => {
  let component: TabAdminPage;
  let fixture: ComponentFixture<TabAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
