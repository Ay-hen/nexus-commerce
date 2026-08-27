import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreSettings } from './store-settings';

describe('StoreSettings', () => {
  let component: StoreSettings;
  let fixture: ComponentFixture<StoreSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
