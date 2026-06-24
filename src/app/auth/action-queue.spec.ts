import { TestBed } from '@angular/core/testing';

import { ActionQueue } from './action-queue';

describe('ActionQueue', () => {
  let service: ActionQueue;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionQueue);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
