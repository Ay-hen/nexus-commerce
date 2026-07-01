import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCategoryModal } from './view-category-modal';

describe('ViewCategoryModal', () => {
  let component: ViewCategoryModal;
  let fixture: ComponentFixture<ViewCategoryModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCategoryModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewCategoryModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
