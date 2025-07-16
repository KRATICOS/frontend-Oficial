import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditMaterialPage } from './edit-material.page';

describe('EditMaterialPage', () => {
  let component: EditMaterialPage;
  let fixture: ComponentFixture<EditMaterialPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMaterialPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
