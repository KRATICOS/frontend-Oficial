import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditperfilPage } from './editperfil.page';

describe('EditperfilPage', () => {
  let component: EditperfilPage;
  let fixture: ComponentFixture<EditperfilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditperfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
