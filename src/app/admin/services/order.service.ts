// order.service.ts
// Data + business-rule layer for the admin Orders module.
//
// BACKEND STATUS: the repository contains no order endpoints yet, so — exactly
// like Products / Customers / Inventory — this service owns an in-memory
// store (the same seed data the Orders list page used to generate for itself)
// and every mutation carries its Spring Boot call as a commented stub. When
// the backend exists, replace the marked bodies with HttpClient calls; the
// components (orders list, create-order, update-order) will not change.

import { Injectable, inject, signal } from '@angular/core';
import { LanguageService } from '../../localization/language.service';
import {
  Order, OrderAddress, OrderCatalogProduct, OrderCustomer, OrderFormItem, OrderFormValue,
  OrderLineItem, OrderLockState, OrderStatus, OrderTotals, PaymentMethod, PaymentStatus,
  ShippingMethod, ShippingStatus, TimelineEvent, TimelineKind, InventoryStatus,
  EMPLOYEES, LOW_STOCK_THRESHOLD, NO_TRACKING, PAYMENT_METHODS, SHIPPING_COMPANIES,
  SHIPPING_COSTS, SHIPPING_METHODS, TAX_RATE,
} from '../model/order.model';

const PHONE_PATTERN = /^[+0-9()\s.-]{6,20}$/;
const COUPON_PATTERN = /^[A-Za-z0-9_-]*$/;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private lang = inject(LanguageService);

  /** Staff members an order can be assigned to. */
  readonly employees = EMPLOYEES;
  /** Carriers offered in the shipping section. */
  readonly shippingCompanies = SHIPPING_COMPANIES;

  // Stock levels mirror the product records used by EditProduct until a shared
  // products API exists (sku -> units available).
  private catalogStock: Record<string, number> = {
    'SONY-WH-XM6': 12, 'APL-APP-2G': 25, 'SAM-S24U': 8, 'APL-MBP-M3': 5, 'APL-UW-S3': 18,
  };

  private customerPool = [
    { name: 'Ayoub Hennani', email: 'ayoub@nexus.com', phone: '+212 6 12 34 56 78' },
    { name: 'Sara Idrissi', email: 'sara@mail.com', phone: '+212 6 22 11 44 09' },
    { name: 'Karim Mansouri', email: 'karim@mail.com', phone: '+212 6 61 78 90 12' },
    { name: 'Leila Boudali', email: 'leila@mail.com', phone: '+212 6 55 32 87 40' },
    { name: 'Youssef Alami', email: 'youssef@mail.com', phone: '+212 6 44 90 21 33' },
    { name: 'Nadia Cherkaoui', email: 'nadia@mail.com', phone: '+212 6 09 87 65 43' },
    { name: 'Omar Fassi', email: 'omar@mail.com', phone: '+212 6 71 20 55 19' },
    { name: 'Ines Bennis', email: 'ines@mail.com', phone: '+212 6 33 48 91 27' },
  ];

  private productPool: { name: string; sku: string; image: string; price: number }[] = [
    { name: 'WH-XM6 Wireless ANC', sku: 'SONY-WH-XM6', image: '/products/headphones.png', price: 249 },
    { name: 'AirPods Pro 2nd Gen', sku: 'APL-APP-2G', image: '/products/airpods pro w1.png', price: 199 },
    { name: 'Galaxy S24 Ultra', sku: 'SAM-S24U', image: '/products/samsung galxy s24 ultra silver.png', price: 1099 },
    { name: 'MacBook Pro M3', sku: 'APL-MBP-M3', image: '/products/macbook pro 13.png', price: 1999 },
    { name: 'Ultra Watch Series 3', sku: 'APL-UW-S3', image: '/products/appel watch.png', price: 189 },
  ];

  private cities = ['Casablanca', 'Rabat', 'Marrakesh', 'Tangier', 'Fes'];

  private statusCycle: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded',
  ];

  // ── Mock data (generated once, mutable via signal) ───────────────────────
  readonly orders = signal<Order[]>(this.generateMockOrders());

  private orderNumberFor(i: number): string {
    return '#ORD-' + (10450 + i * 3);
  }

  private buildTimeline(status: OrderStatus, orderDate: Date, employee: string): TimelineEvent[] {
    const steps: { kind: TimelineKind; label: string }[] = [
      { kind: 'placed', label: 'Order Placed' },
      { kind: 'payment', label: 'Payment Received' },
      { kind: 'confirmed', label: 'Order Confirmed' },
      { kind: 'packed', label: 'Order Packed' },
      { kind: 'shipped', label: 'Order Shipped' },
      { kind: 'out-for-delivery', label: 'Out for Delivery' },
      { kind: 'delivered', label: 'Order Delivered' },
    ];

    const statusIndexMap: Record<OrderStatus, number> = {
      pending: 0, confirmed: 2, processing: 2, packed: 3,
      shipped: 4, delivered: 6, cancelled: 1, refunded: 6,
    };

    const cutoff = statusIndexMap[status];
    const events: TimelineEvent[] = [];
    let cursor = new Date(orderDate);

    for (let i = 0; i <= cutoff && i < steps.length; i++) {
      cursor = new Date(cursor.getTime() + (i === 0 ? 0 : (3 + i) * 3600000));
      events.push({
        id: 'tl-' + i,
        kind: steps[i].kind,
        label: steps[i].label,
        date: cursor.toISOString(),
        employee: i === 0 ? 'System' : employee,
        notes: this.timelineNoteFor(steps[i].kind),
      });
    }

    if (status === 'cancelled') {
      cursor = new Date(cursor.getTime() + 5 * 3600000);
      events.push({
        id: 'tl-cancel', kind: 'cancelled', label: 'Order Cancelled',
        date: cursor.toISOString(), employee,
        notes: 'Cancelled at customer request',
      });
    }
    if (status === 'refunded') {
      cursor = new Date(cursor.getTime() + 8 * 3600000);
      events.push({
        id: 'tl-refund', kind: 'refunded', label: 'Order Refunded',
        date: cursor.toISOString(), employee,
        notes: 'Refund processed to original payment method',
      });
    }

    return events.reverse();
  }

  // NOTE: these notes simulate backend-supplied audit descriptions — treated
  // as data, not UI copy, and left untranslated (same policy as inventory's
  // movement notes).
  private timelineNoteFor(kind: TimelineKind): string {
    const map: Record<TimelineKind, string> = {
      placed: 'Customer placed the order online',
      payment: 'Payment captured successfully',
      confirmed: 'Order confirmed and queued for fulfillment',
      packed: 'Items picked and packed at warehouse',
      shipped: 'Handed off to shipping carrier',
      'out-for-delivery': 'Package is out for delivery',
      delivered: 'Package delivered to customer',
      cancelled: 'Cancelled at customer request',
      refunded: 'Refund processed to original payment method',
      updated: 'Order details updated',
    };
    return map[kind];
  }

  private generateMockOrders(): Order[] {
    const methods = PAYMENT_METHODS;
    const shipMethods = SHIPPING_METHODS;
    const paymentStatuses: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];
    const shippingStatuses: ShippingStatus[] = ['preparing', 'ready', 'in-transit', 'delivered', 'returned'];

    const orders: Order[] = [];
    const now = Date.now();

    for (let i = 0; i < 32; i++) {
      const customer = this.customerPool[i % this.customerPool.length];
      const status = this.statusCycle[i % this.statusCycle.length];
      const paymentMethod = methods[i % methods.length];
      const shippingMethod = shipMethods[i % shipMethods.length];
      const employee = EMPLOYEES[i % EMPLOYEES.length];
      const daysAgo = i % 34;
      const orderDate = new Date(now - daysAgo * 86400000 - (i * 1800000));

      const itemCount = 1 + (i % 3);
      const items: OrderLineItem[] = [];
      for (let j = 0; j < itemCount; j++) {
        const p = this.productPool[(i + j) % this.productPool.length];
        const qty = 1 + ((i + j) % 3);
        const discount = (i + j) % 4 === 0 ? Math.round(p.price * 0.1) : 0;
        items.push({
          id: `it-${i}-${j}`,
          name: p.name,
          sku: p.sku,
          image: p.image,
          price: p.price,
          quantity: qty,
          discount,
          inventoryStatus: (i + j) % 7 === 0 ? 'out-of-stock' : (i + j) % 5 === 0 ? 'low-stock' : 'in-stock',
        });
      }

      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const discount = items.reduce((s, it) => s + it.discount, 0) + (i % 6 === 0 ? 20 : 0);
      const shippingCost = SHIPPING_COSTS[shippingMethod];
      const tax = Math.round((subtotal - discount) * TAX_RATE);
      const total = Math.max(0, subtotal - discount + shippingCost + tax);

      const city = this.cities[i % this.cities.length];
      const address: OrderAddress = {
        name: customer.name,
        phone: customer.phone,
        street: `${12 + i} Rue Al Amal`,
        city,
        state: city,
        zip: `${20000 + i * 3}`,
        country: 'Morocco',
      };

      const paymentStatus: PaymentStatus = status === 'refunded' ? 'refunded'
        : status === 'cancelled' ? 'failed'
        : paymentStatuses[i % paymentStatuses.length] === 'refunded' ? 'paid'
        : paymentStatuses[i % paymentStatuses.length];

      const shippingStatus: ShippingStatus = status === 'delivered' ? 'delivered'
        : status === 'shipped' ? 'in-transit'
        : status === 'packed' ? 'ready'
        : status === 'refunded' ? 'returned'
        : shippingStatuses[i % shippingStatuses.length];

      orders.push({
        id: 'ord-' + i,
        orderNumber: this.orderNumberFor(i),
        customer: {
          id: 'cust-' + (i % this.customerPool.length),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          avatar: customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          customerSince: new Date(now - (400 + i * 17) * 86400000).toISOString().slice(0, 10),
          totalOrders: 2 + (i % 12),
          lifetimeSpend: 400 + (i * 173) % 5200,
          vip: (i % 5 === 0),
        },
        items,
        orderDate: orderDate.toISOString(),
        status,
        paymentMethod,
        paymentStatus,
        shippingMethod,
        shippingStatus,
        assignedEmployee: employee,
        lastUpdated: new Date(orderDate.getTime() + (2 + i % 5) * 3600000).toISOString(),

        subtotal,
        discount,
        couponCode: i % 6 === 0 ? 'SAVE20' : null,
        shippingCost,
        tax,
        total,

        shippingAddress: address,
        billingAddress: address,
        payment: {
          method: paymentMethod,
          transactionId: 'TXN-' + (900000 + i * 47),
          date: orderDate.toISOString(),
          status: paymentStatus,
          amountPaid: paymentStatus === 'paid' || paymentStatus === 'refunded' ? total : 0,
          refundAmount: paymentStatus === 'refunded' ? total : 0,
          invoiceNumber: 'INV-' + (2200 + i),
        },
        shipping: {
          method: shippingMethod,
          company: SHIPPING_COMPANIES[i % SHIPPING_COMPANIES.length],
          trackingNumber: shippingMethod === 'Pickup' ? '—' : 'TRK' + (5000000 + i * 91),
          estimatedDelivery: new Date(orderDate.getTime() + 5 * 86400000).toISOString().slice(0, 10),
          cost: shippingCost,
          status: shippingStatus,
        },
        timeline: this.buildTimeline(status, orderDate, employee),
        notes: i % 4 === 0 ? 'Customer requested gift wrapping.' : '',
      });
    }

    return orders;
  }

  // ── Directories used by the form pickers ──────────────────────────────────
  /** One entry per customer (first occurrence in the seeded orders). */
  readonly customers: OrderCustomer[] = this.buildCustomerDirectory();

  /** Products that can be added to an order. */
  readonly catalog: OrderCatalogProduct[] = this.productPool.map(p => ({
    ...p, stock: this.catalogStock[p.sku] ?? 0,
  }));

  private buildCustomerDirectory(): OrderCustomer[] {
    const seen = new Map<string, OrderCustomer>();
    for (const o of this.orders()) {
      if (!seen.has(o.customer.id)) seen.set(o.customer.id, { ...o.customer });
    }
    return [...seen.values()];
  }

  // ── Reads / writes (backend stubs) ────────────────────────────────────────
  async load(id: string): Promise<Order | null> {
    // Replace with:
    // return firstValueFrom(this.http.get<Order>(`/api/admin/orders/${id}`, { headers: authHeaders }));
    await new Promise(r => setTimeout(r, 600));
    return this.orders().find(o => o.id === id) ?? null;
  }

  async create(value: OrderFormValue): Promise<Order> {
    const order = this.buildOrder(value);
    // Replace with:
    // const saved = await firstValueFrom(this.http.post<Order>('/api/admin/orders', order, { headers: authHeaders }));
    await new Promise(r => setTimeout(r, 900));
    this.orders.update(list => [order, ...list]);
    return order;
  }

  async update(id: string, value: OrderFormValue): Promise<Order> {
    const existing = this.orders().find(o => o.id === id);
    if (!existing) throw new Error('ORDER_NOT_FOUND');
    const next = this.applyUpdate(existing, value);
    // Replace with:
    // const saved = await firstValueFrom(this.http.put<Order>(`/api/admin/orders/${id}`, next, { headers: authHeaders }));
    await new Promise(r => setTimeout(r, 900));
    this.orders.update(list => list.map(o => o.id === id ? next : o));
    return next;
  }

  // ── Business rules ────────────────────────────────────────────────────────
  calculateTotals(items: OrderFormItem[], extraDiscount: number | null, method: ShippingMethod): OrderTotals {
    const subtotal = items.reduce((s, it) => s + it.price * (it.quantity ?? 0), 0);
    const lineDiscounts = items.reduce((s, it) => s + (it.discount ?? 0), 0);
    const discount = Math.min(subtotal, lineDiscounts + (extraDiscount ?? 0));
    const shippingCost = SHIPPING_COSTS[method];
    const tax = Math.round((subtotal - discount) * TAX_RATE);
    const total = Math.max(0, subtotal - discount + shippingCost + tax);
    return { subtotal, lineDiscounts, discount, shippingCost, tax, total };
  }

  stockStatus(stock: number): InventoryStatus {
    return stock <= 0 ? 'out-of-stock' : stock <= LOW_STOCK_THRESHOLD ? 'low-stock' : 'in-stock';
  }

  productBySku(sku: string): OrderCatalogProduct | undefined {
    return this.catalog.find(p => p.sku === sku);
  }

  /** `true` means the group is locked for this order. */
  lockStateFor(order: Order): OrderLockState {
    const finished = order.status === 'delivered' || order.status === 'cancelled' || order.status === 'refunded';
    const paymentSettled = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
    return {
      readOnly: finished,
      pricing: finished || paymentSettled || order.status === 'packed' || order.status === 'shipped',
      addresses: finished || order.status === 'shipped',
      payment: finished || paymentSettled,
      shipment: finished,
    };
  }

  // ── Form <-> Order mapping ────────────────────────────────────────────────
  private blankAddress(): OrderAddress {
    return { name: '', phone: '', street: '', city: '', state: '', zip: '', country: '' };
  }

  newItem(): OrderFormItem {
    return { uid: crypto.randomUUID(), sku: '', name: '', image: '', price: 0, quantity: 1, discount: null };
  }

  emptyFormValue(): OrderFormValue {
    const eta = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    return {
      customerId: '',
      items: [this.newItem()],
      extraDiscount: null,
      couponCode: '',
      paymentMethod: PAYMENT_METHODS[0],
      paymentStatus: 'pending',
      shippingMethod: SHIPPING_METHODS[0],
      shippingCompany: SHIPPING_COMPANIES[0],
      trackingNumber: '',
      estimatedDelivery: eta,
      shippingAddress: this.blankAddress(),
      billingSameAsShipping: true,
      billingAddress: this.blankAddress(),
      assignedEmployee: 'Unassigned',
      notes: '',
    };
  }

  formValueFromOrder(o: Order): OrderFormValue {
    const lineDiscounts = o.items.reduce((s, it) => s + it.discount, 0);
    const sameAddress = (Object.keys(o.shippingAddress) as (keyof OrderAddress)[])
      .every(k => o.shippingAddress[k] === o.billingAddress[k]);
    return {
      customerId: o.customer.id,
      items: o.items.map(it => ({
        uid: it.id, sku: it.sku, name: it.name, image: it.image,
        price: it.price, quantity: it.quantity, discount: it.discount,
      })),
      extraDiscount: Math.max(0, o.discount - lineDiscounts),
      couponCode: o.couponCode ?? '',
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingMethod: o.shippingMethod,
      shippingCompany: o.shipping.company,
      trackingNumber: o.shipping.trackingNumber === NO_TRACKING ? '' : o.shipping.trackingNumber,
      estimatedDelivery: o.shipping.estimatedDelivery,
      shippingAddress: { ...o.shippingAddress },
      billingSameAsShipping: sameAddress,
      billingAddress: { ...o.billingAddress },
      assignedEmployee: o.assignedEmployee,
      notes: o.notes,
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────
  /**
   * Returns a map of field key -> message (empty map = valid).
   * Locked groups (update mode) are skipped: they are never written back.
   */
  validate(v: OrderFormValue, mode: 'create' | 'update', orderDate: string, lock: OrderLockState | null): Record<string, string> {
    const t = (k: string, p?: Record<string, string | number>) => this.lang.translate('orders.form.errors.' + k, p);
    const errs: Record<string, string> = {};

    if (mode === 'create' && !v.customerId) errs['customerId'] = t('customerRequired');

    if (!lock || !lock.pricing) {
      const filled = v.items;
      if (filled.length === 0) errs['items'] = t('itemsRequired');
      const seen = new Set<string>();
      for (const it of filled) {
        const prod = this.productBySku(it.sku);
        if (!it.sku) { errs[`item.${it.uid}.sku`] = t('productRequired'); continue; }
        if (seen.has(it.sku)) errs[`item.${it.uid}.sku`] = t('productDuplicate');
        seen.add(it.sku);

        const qty = it.quantity;
        if (qty === null || !Number.isInteger(qty) || qty < 1) {
          errs[`item.${it.uid}.quantity`] = t('quantityInvalid');
        } else if (prod && qty > prod.stock) {
          errs[`item.${it.uid}.quantity`] = t('quantityExceedsStock', { stock: prod.stock });
        }
        const d = it.discount ?? 0;
        if (d < 0) errs[`item.${it.uid}.discount`] = t('discountNegative');
        else if (qty && d > it.price * qty) errs[`item.${it.uid}.discount`] = t('discountTooHigh');
      }
      if ((v.extraDiscount ?? 0) < 0) errs['extraDiscount'] = t('discountNegative');
      const totals = this.calculateTotals(v.items, v.extraDiscount, v.shippingMethod);
      const rawDiscount = totals.lineDiscounts + (v.extraDiscount ?? 0);
      if (!errs['extraDiscount'] && rawDiscount > totals.subtotal) errs['extraDiscount'] = t('discountExceedsSubtotal');
      const coupon = v.couponCode.trim();
      if (coupon.length > 20 || !COUPON_PATTERN.test(coupon)) errs['couponCode'] = t('couponInvalid');
    }

    if (!lock || !lock.shipment) {
      if (!v.estimatedDelivery) errs['estimatedDelivery'] = t('estimatedDeliveryRequired');
      else if (v.estimatedDelivery < orderDate.slice(0, 10)) errs['estimatedDelivery'] = t('estimatedDeliveryPast');
      if (v.trackingNumber.trim().length > 40) errs['trackingNumber'] = t('trackingTooLong');
      if (v.shippingMethod !== 'Pickup' && !v.shippingCompany) errs['shippingCompany'] = t('shippingCompanyRequired');
    }

    if (!lock || !lock.addresses) {
      this.validateAddress('shippingAddress', v.shippingAddress, errs, t);
      if (!v.billingSameAsShipping) this.validateAddress('billingAddress', v.billingAddress, errs, t);
    }

    if (v.notes.length > 500) errs['notes'] = t('notesTooLong');
    return errs;
  }

  private validateAddress(
    prefix: string, a: OrderAddress, errs: Record<string, string>,
    t: (k: string, p?: Record<string, string | number>) => string,
  ): void {
    if (!a.name.trim()) errs[`${prefix}.name`] = t('nameRequired');
    if (!a.phone.trim()) errs[`${prefix}.phone`] = t('phoneRequired');
    else if (!PHONE_PATTERN.test(a.phone.trim())) errs[`${prefix}.phone`] = t('phoneInvalid');
    if (!a.street.trim()) errs[`${prefix}.street`] = t('streetRequired');
    if (!a.city.trim()) errs[`${prefix}.city`] = t('cityRequired');
    if (!a.zip.trim()) errs[`${prefix}.zip`] = t('zipRequired');
    else if (a.zip.trim().length > 12) errs[`${prefix}.zip`] = t('zipInvalid');
    if (!a.country.trim()) errs[`${prefix}.country`] = t('countryRequired');
  }

  // ── Builders ──────────────────────────────────────────────────────────────
  private trimAddress(a: OrderAddress): OrderAddress {
    return {
      name: a.name.trim(), phone: a.phone.trim(), street: a.street.trim(),
      city: a.city.trim(), state: a.state.trim(), zip: a.zip.trim(), country: a.country.trim(),
    };
  }

  private toLineItems(items: OrderFormItem[]): OrderLineItem[] {
    return items.map(it => ({
      id: it.uid,
      name: it.name,
      sku: it.sku,
      image: it.image,
      price: it.price,
      quantity: Number(it.quantity),
      discount: it.discount ?? 0,
      inventoryStatus: this.stockStatus(this.productBySku(it.sku)?.stock ?? 0),
    }));
  }

  private nextSequence(values: string[], fallback: number): number {
    const nums = values.map(v => Number((v.match(/(\d+)$/) ?? [])[1])).filter(n => Number.isFinite(n));
    return nums.length ? Math.max(...nums) + 1 : fallback;
  }

  private buildOrder(v: OrderFormValue): Order {
    const customerRef = this.customers.find(c => c.id === v.customerId);
    if (!customerRef) throw new Error('CUSTOMER_NOT_FOUND');

    const now = new Date().toISOString();
    const list = this.orders();
    const items = this.toLineItems(v.items);
    const totals = this.calculateTotals(v.items, v.extraDiscount, v.shippingMethod);
    const shippingAddress = this.trimAddress(v.shippingAddress);
    const billingAddress = v.billingSameAsShipping ? { ...shippingAddress } : this.trimAddress(v.billingAddress);
    const paid = v.paymentStatus === 'paid';
    const tracking = v.shippingMethod === 'Pickup' ? NO_TRACKING : (v.trackingNumber.trim() || NO_TRACKING);
    const coupon = v.couponCode.trim().toUpperCase();

    const timeline: TimelineEvent[] = [];
    timeline.push({
      id: 'tl-' + crypto.randomUUID(), kind: 'placed',
      label: this.lang.translate('orders.timeline.placed'),
      date: now, employee: 'You',
      notes: this.lang.translate('orders.form.timeline.createdByAdmin'),
    });
    if (paid) {
      timeline.unshift({
        id: 'tl-' + crypto.randomUUID(), kind: 'payment',
        label: this.lang.translate('orders.timeline.payment'),
        date: now, employee: 'You',
        notes: this.lang.translate('orders.form.timeline.paymentRecorded'),
      });
    }

    return {
      id: 'ord-' + crypto.randomUUID().slice(0, 8),
      orderNumber: '#ORD-' + this.nextSequence(list.map(o => o.orderNumber), 10450),
      customer: customerRef,
      items,
      orderDate: now,
      status: 'pending',
      paymentMethod: v.paymentMethod,
      paymentStatus: v.paymentStatus,
      shippingMethod: v.shippingMethod,
      shippingStatus: 'preparing',
      assignedEmployee: v.assignedEmployee,
      lastUpdated: now,

      subtotal: totals.subtotal,
      discount: totals.discount,
      couponCode: coupon || null,
      shippingCost: totals.shippingCost,
      tax: totals.tax,
      total: totals.total,

      shippingAddress,
      billingAddress,
      payment: {
        method: v.paymentMethod,
        transactionId: paid ? 'TXN-' + this.nextSequence(list.map(o => o.payment.transactionId), 900000) : NO_TRACKING,
        date: now,
        status: v.paymentStatus,
        amountPaid: paid ? totals.total : 0,
        refundAmount: 0,
        invoiceNumber: 'INV-' + this.nextSequence(list.map(o => o.payment.invoiceNumber), 2200),
      },
      shipping: {
        method: v.shippingMethod,
        company: v.shippingCompany,
        trackingNumber: tracking,
        estimatedDelivery: v.estimatedDelivery,
        cost: totals.shippingCost,
        status: 'preparing',
      },
      timeline,
      notes: v.notes.trim(),
    };
  }

  /** Applies only the field groups that are still editable; everything else is carried over untouched. */
  private applyUpdate(existing: Order, v: OrderFormValue): Order {
    const lock = this.lockStateFor(existing);
    const now = new Date().toISOString();
    const next: Order = {
      ...existing,
      items: existing.items,
      shippingAddress: existing.shippingAddress,
      billingAddress: existing.billingAddress,
      payment: { ...existing.payment },
      shipping: { ...existing.shipping },
      timeline: existing.timeline,
    };
    const changed: string[] = [];
    let becamePaid = false;

    if (!lock.pricing) {
      const items = this.toLineItems(v.items);
      const totals = this.calculateTotals(v.items, v.extraDiscount, v.shippingMethod);
      const coupon = v.couponCode.trim().toUpperCase() || null;
      const sig = (list: OrderLineItem[]) => list.map(i => `${i.sku}|${i.quantity}|${i.discount}`).join(';');
      if (sig(items) !== sig(existing.items)) changed.push('items');
      if (coupon !== existing.couponCode || v.shippingMethod !== existing.shippingMethod
          || totals.discount !== existing.discount) changed.push('pricing');
      next.items = items;
      next.subtotal = totals.subtotal;
      next.discount = totals.discount;
      next.couponCode = coupon;
      next.shippingMethod = v.shippingMethod;
      next.shippingCost = totals.shippingCost;
      next.tax = totals.tax;
      next.total = totals.total;
      next.shipping.method = v.shippingMethod;
      next.shipping.cost = totals.shippingCost;
    }

    if (!lock.addresses) {
      const ship = this.trimAddress(v.shippingAddress);
      const bill = v.billingSameAsShipping ? { ...ship } : this.trimAddress(v.billingAddress);
      if (JSON.stringify(ship) !== JSON.stringify(existing.shippingAddress)) changed.push('shippingAddress');
      if (JSON.stringify(bill) !== JSON.stringify(existing.billingAddress)) changed.push('billingAddress');
      next.shippingAddress = ship;
      next.billingAddress = bill;
    }

    if (!lock.shipment) {
      const tracking = next.shippingMethod === 'Pickup' ? NO_TRACKING : (v.trackingNumber.trim() || NO_TRACKING);
      if (v.shippingCompany !== existing.shipping.company || tracking !== existing.shipping.trackingNumber
          || v.estimatedDelivery !== existing.shipping.estimatedDelivery) changed.push('shipment');
      next.shipping.company = v.shippingCompany;
      next.shipping.trackingNumber = tracking;
      next.shipping.estimatedDelivery = v.estimatedDelivery;
    }

    if (!lock.payment) {
      if (v.paymentMethod !== existing.paymentMethod || v.paymentStatus !== existing.paymentStatus) changed.push('payment');
      next.paymentMethod = v.paymentMethod;
      next.paymentStatus = v.paymentStatus;
      next.payment.method = v.paymentMethod;
      next.payment.status = v.paymentStatus;
      if (v.paymentStatus === 'paid' && existing.paymentStatus !== 'paid') {
        becamePaid = true;
        next.payment.amountPaid = next.total;
        next.payment.date = now;
        if (next.payment.transactionId === NO_TRACKING) {
          next.payment.transactionId = 'TXN-' + this.nextSequence(this.orders().map(o => o.payment.transactionId), 900000);
        }
      }
    }

    if (v.assignedEmployee !== existing.assignedEmployee) changed.push('assignee');
    if (v.notes.trim() !== existing.notes) changed.push('notes');
    next.assignedEmployee = v.assignedEmployee;
    next.notes = v.notes.trim();

    if (changed.length === 0) return existing;   // nothing to persist

    const events: TimelineEvent[] = [{
      id: 'tl-' + crypto.randomUUID(), kind: 'updated',
      label: this.lang.translate('orders.timeline.updated'),
      date: now, employee: 'You',
      notes: this.lang.translate('orders.form.timeline.updatedFields', {
        fields: changed.map(c => this.lang.translate('orders.form.changed.' + c)).join(', '),
      }),
    }];
    if (becamePaid) {
      events.unshift({
        id: 'tl-' + crypto.randomUUID(), kind: 'payment',
        label: this.lang.translate('orders.timeline.payment'),
        date: now, employee: 'You',
        notes: this.lang.translate('orders.form.timeline.paymentRecorded'),
      });
    }
    next.timeline = [...events, ...existing.timeline];
    next.lastUpdated = now;
    return next;
  }
}