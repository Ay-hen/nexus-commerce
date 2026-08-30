import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsSettings } from './payments-settings';

describe('PaymentsSettings', () => {
  let component: PaymentsSettings;
  let fixture: ComponentFixture<PaymentsSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
