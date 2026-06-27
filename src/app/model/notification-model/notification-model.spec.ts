import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationModel } from './notification-model';

describe('NotificationModel', () => {
  let component: NotificationModel;
  let fixture: ComponentFixture<NotificationModel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationModel],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationModel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
