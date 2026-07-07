import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewReviewModal } from './view-review-modal';

describe('ViewReviewModal', () => {
  let component: ViewReviewModal;
  let fixture: ComponentFixture<ViewReviewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewReviewModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewReviewModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
