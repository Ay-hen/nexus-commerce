import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppearanceSettings } from './appearance-settings';

describe('AppearanceSettings', () => {
  let component: AppearanceSettings;
  let fixture: ComponentFixture<AppearanceSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppearanceSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(AppearanceSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
