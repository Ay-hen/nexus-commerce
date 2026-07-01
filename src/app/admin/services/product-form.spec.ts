import { TestBed } from '@angular/core/testing';

import { ProductForm } from './product-form';

describe('ProductForm', () => {
  let service: ProductForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductForm);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
