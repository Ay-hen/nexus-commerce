import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailSettings } from './email-settings';

describe('EmailSettings', () => {
  let component: EmailSettings;
  let fixture: ComponentFixture<EmailSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
