import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TabsAdminPage } from './tabs-Admin.page';

describe('TabsPage', () => {
  let component: TabsAdminPage;
  let fixture: ComponentFixture<TabsAdminPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsAdminPage],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
