import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationDetailModel } from './notification-detail-model';

describe('NotificationDetailModel', () => {
  let component: NotificationDetailModel;
  let fixture: ComponentFixture<NotificationDetailModel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationDetailModel],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationDetailModel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
