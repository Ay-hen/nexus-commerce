import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecuritySettings } from './security-settings';

describe('SecuritySettings', () => {
  let component: SecuritySettings;
  let fixture: ComponentFixture<SecuritySettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecuritySettings],
    }).compileComponents();

    fixture = TestBed.createComponent(SecuritySettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
