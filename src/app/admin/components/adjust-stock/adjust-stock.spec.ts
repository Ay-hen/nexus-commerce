import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdjustStock } from './adjust-stock';

describe('AdjustStock', () => {
  let component: AdjustStock;
  let fixture: ComponentFixture<AdjustStock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdjustStock],
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustStock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
