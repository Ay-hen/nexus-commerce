import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewActivityModal } from './view-activity-modal';

describe('ViewActivityModal', () => {
  let component: ViewActivityModal;
  let fixture: ComponentFixture<ViewActivityModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewActivityModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewActivityModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
