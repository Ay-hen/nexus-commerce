import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rewiews } from './rewiews';

describe('Rewiews', () => {
  let component: Rewiews;
  let fixture: ComponentFixture<Rewiews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rewiews],
    }).compileComponents();

    fixture = TestBed.createComponent(Rewiews);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
