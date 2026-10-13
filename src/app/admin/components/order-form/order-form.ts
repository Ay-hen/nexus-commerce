// order-form.ts
// Shared order form used by CreateOrder and UpdateOrder. It owns the form
// state, live totals and validation; the parent page owns loading, saving,
// notifications and navigation.
import { Component, ChangeDetectionStrategy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';
import { OrderService } from '../../services/order.service';
import {
  Order, OrderAddress, OrderFormItem, OrderFormValue, OrderLockState, OrderTotals,
  PaymentMethod, PaymentStatus, ShippingMethod,
  PAYMENT_METHODS, SHIPPING_METHODS, SHIPPING_METHOD_KEY_MAP,
} from '../../model/order.model';

type AddressKey = 'shippingAddress' | 'billingAddress';

const PAYMENT_METHOD_KEY_MAP: Record<PaymentMethod, string> = {
  'Credit Card': 'creditCard', 'PayPal': 'paypal', 'Cash on Delivery': 'cashOnDelivery',
  'Bank Transfer': 'bankTransfer', 'Wallet': 'wallet',
};

@Component({
  selector: 'app-order-form',
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderForm implements OnInit {
  private orderService = inject(OrderService);
  protected lang = inject(LanguageService);

  // ── Inputs / outputs ──────────────────────────────────────────────────────
  mode = input.required<'create' | 'update'>();
  /** The order being edited (update mode only). */
  order = input<Order | null>(null);
  heading = input.required<string>();
  subheading = input<string>('');
  saving = input(false);

  submitted = output<OrderFormValue>();
  cancelled = output<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  form = signal<OrderFormValue>(this.orderService.emptyFormValue());
  errors = signal<Record<string, string>>({});
  private snapshot = signal('');

  // ── Option lists ──────────────────────────────────────────────────────────
  readonly customers = this.orderService.customers;
  readonly catalog = this.orderService.catalog;
  readonly employees = this.orderService.employees;
  readonly shippingCompanies = this.orderService.shippingCompanies;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly shippingMethods = SHIPPING_METHODS;

  readonly addressFields: { key: keyof OrderAddress; label: string; required: boolean; full: boolean }[] = [
    { key: 'name',    label: 'orders.form.fields.name',    required: true,  full: false },
    { key: 'phone',   label: 'orders.form.fields.phone',   required: true,  full: false },
    { key: 'street',  label: 'orders.form.fields.street',  required: true,  full: true  },
    { key: 'city',    label: 'orders.form.fields.city',    required: true,  full: false },
    { key: 'state',   label: 'orders.form.fields.state',   required: false, full: false },
    { key: 'zip',     label: 'orders.form.fields.zip',     required: true,  full: false },
    { key: 'country', label: 'orders.form.fields.country', required: true,  full: false },
  ];

  // ── Derived state ─────────────────────────────────────────────────────────
  isUpdate = computed(() => this.mode() === 'update');

  /** Locked field groups (update mode only; create has everything open). */
  lock = computed<OrderLockState>(() => {
    const o = this.order();
    return this.isUpdate() && o
      ? this.orderService.lockStateFor(o)
      : { readOnly: false, pricing: false, addresses: false, payment: false, shipment: false };
  });

  /** Why pricing is locked, for the explanatory banner. */
  pricingLockReason = computed<'' | 'finished' | 'paid' | 'packed'>(() => {
    const o = this.order();
    if (!this.isUpdate() || !o || !this.lock().pricing) return '';
    if (this.lock().readOnly) return 'finished';
    return o.paymentStatus === 'paid' ? 'paid' : 'packed';
  });

  isDirty = computed(() => JSON.stringify(this.form()) !== this.snapshot());
  canSubmit = computed(() => !this.saving() && (!this.isUpdate() || this.isDirty()));

  selectedCustomer = computed(() => {
    const o = this.order();
    if (this.isUpdate() && o) return o.customer;
    return this.customers.find(c => c.id === this.form().customerId) ?? null;
  });

  totals = computed<OrderTotals>(() => {
    const o = this.order();
    if (this.isUpdate() && o && this.lock().pricing) {
      return {
        subtotal: o.subtotal,
        lineDiscounts: o.items.reduce((s, it) => s + it.discount, 0),
        discount: o.discount,
        shippingCost: o.shippingCost,
        tax: o.tax,
        total: o.total,
      };
    }
    const f = this.form();
    return this.orderService.calculateTotals(f.items, f.extraDiscount, f.shippingMethod);
  });

  paymentStatusOptions = computed<PaymentStatus[]>(() =>
    this.isUpdate() ? ['pending', 'failed', 'paid'] : ['pending', 'paid']);

  itemCount = computed(() => this.form().items.reduce((s, it) => s + (it.quantity ?? 0), 0));

  minDeliveryDate = computed(() => {
    const o = this.order();
    return (this.isUpdate() && o ? o.orderDate : new Date().toISOString()).slice(0, 10);
  });

  ngOnInit(): void {
    const o = this.order();
    const initial = this.isUpdate() && o
      ? this.orderService.formValueFromOrder(o)
      : this.orderService.emptyFormValue();
    this.form.set(initial);
    this.snapshot.set(JSON.stringify(initial));
  }

  // ── Generic patching ──────────────────────────────────────────────────────
  private clearErrors(...keys: string[]): void {
    this.errors.update(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }

  patch(patch: Partial<OrderFormValue>): void {
    this.form.update(f => ({ ...f, ...patch }));
    this.clearErrors(...Object.keys(patch));
  }

  patchAddress(key: AddressKey, patch: Partial<OrderAddress>): void {
    this.form.update(f => ({ ...f, [key]: { ...f[key], ...patch } }));
    this.clearErrors(...Object.keys(patch).map(k => `${key}.${k}`));
  }

  onAddressInput(key: AddressKey, field: keyof OrderAddress, event: Event): void {
    this.patchAddress(key, { [field]: (event.target as HTMLInputElement).value });
  }

  parseNumber(raw: string): number | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // ── Customer ──────────────────────────────────────────────────────────────
  selectCustomer(id: string): void {
    const customer = this.customers.find(c => c.id === id);
    this.patch({ customerId: id });
    const addr = this.form().shippingAddress;
    // Pre-fill the recipient only while the address is still untouched.
    if (customer && !addr.name && !addr.phone) {
      this.patchAddress('shippingAddress', { name: customer.name, phone: customer.phone });
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  addItem(): void {
    this.form.update(f => ({ ...f, items: [...f.items, this.orderService.newItem()] }));
    this.clearErrors('items');
  }

  removeItem(uid: string): void {
    if (this.form().items.length <= 1) return;
    this.form.update(f => ({ ...f, items: f.items.filter(it => it.uid !== uid) }));
    this.clearErrors('items');
  }

  patchItem(uid: string, patch: Partial<OrderFormItem>): void {
    this.form.update(f => ({ ...f, items: f.items.map(it => it.uid === uid ? { ...it, ...patch } : it) }));
    this.clearErrors(...Object.keys(patch).map(k => `item.${uid}.${k}`));
  }

  selectProduct(uid: string, sku: string): void {
    const p = this.orderService.productBySku(sku);
    if (!p) return;
    this.patchItem(uid, { sku: p.sku, name: p.name, image: p.image, price: p.price });
  }

  isProductTaken(sku: string, uid: string): boolean {
    return this.form().items.some(it => it.uid !== uid && it.sku === sku);
  }

  stockOf(sku: string): number | null {
    return this.orderService.productBySku(sku)?.stock ?? null;
  }

  lineTotal(item: OrderFormItem): number {
    return Math.max(0, item.price * (item.quantity ?? 0) - (item.discount ?? 0));
  }

  // ── Shipping ──────────────────────────────────────────────────────────────
  setShippingMethod(method: ShippingMethod): void {
    this.patch({ shippingMethod: method, ...(method === 'Pickup' ? { trackingNumber: '' } : {}) });
  }

  setBillingSame(same: boolean): void {
    this.patch({ billingSameAsShipping: same });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.canSubmit()) return;
    const o = this.order();
    const orderDate = this.isUpdate() && o ? o.orderDate : new Date().toISOString();
    const errs = this.orderService.validate(
      this.form(), this.mode(), orderDate, this.isUpdate() ? this.lock() : null,
    );
    this.errors.set(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => {
        document.querySelector('.field--error, .field__error--block')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    this.submitted.emit(this.form());
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  hasError(key: string): boolean { return !!this.errors()[key]; }
  errorMsg(key: string): string { return this.errors()[key] ?? ''; }

  formatCurrency(v: number): string { return this.lang.formatCurrency(v); }

  paymentMethodLabel(m: PaymentMethod): string {
    return this.lang.translate('orders.paymentMethods.' + PAYMENT_METHOD_KEY_MAP[m]);
  }

  shippingMethodLabel(m: ShippingMethod): string {
    return this.lang.translate('orders.form.shippingMethods.' + SHIPPING_METHOD_KEY_MAP[m]);
  }

  trackByUid(_: number, item: { uid: string }): string { return item.uid; }
}