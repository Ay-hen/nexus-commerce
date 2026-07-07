import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteReviewModal } from './delete-review-modal';

describe('DeleteReviewModal', () => {
  let component: DeleteReviewModal;
  let fixture: ComponentFixture<DeleteReviewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteReviewModal],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteReviewModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
