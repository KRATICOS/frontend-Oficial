import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddadminPage } from './addadmin.page';

describe('AddadminPage', () => {
  let component: AddadminPage;
  let fixture: ComponentFixture<AddadminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddadminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
