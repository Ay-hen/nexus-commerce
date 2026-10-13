// order.model.ts
// Shared order types, business constants and form contracts for the admin
// Orders module (list, create-order and update-order).
//
// The interfaces below were moved here unchanged from `orders.ts` so that the
// list page, the order form and the OrderService can all share them.

// ─── Domain types ───────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'packed'
  | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type ShippingStatus = 'preparing' | 'ready' | 'in-transit' | 'delivered' | 'returned';
export type PaymentMethod = 'Credit Card' | 'PayPal' | 'Cash on Delivery' | 'Bank Transfer' | 'Wallet';
export type ShippingMethod = 'Standard' | 'Express' | 'Overnight' | 'Pickup';

export type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface OrderLineItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  quantity: number;
  discount: number;
  inventoryStatus: InventoryStatus;
}

export interface OrderAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  customerSince: string;
  totalOrders: number;
  lifetimeSpend: number;
  vip: boolean;
}

export interface OrderPayment {
  method: PaymentMethod;
  transactionId: string;
  date: string;
  status: PaymentStatus;
  amountPaid: number;
  refundAmount: number;
  invoiceNumber: string;
}

export interface OrderShipping {
  method: ShippingMethod;
  company: string;
  trackingNumber: string;
  estimatedDelivery: string;
  cost: number;
  status: ShippingStatus;
}

// 'updated' is used by the Update Order form to log edits in the timeline.
export type TimelineKind =
  | 'placed' | 'payment' | 'confirmed' | 'packed'
  | 'shipped' | 'out-for-delivery' | 'delivered' | 'cancelled' | 'refunded'
  | 'updated';

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  label: string;
  date: string;
  employee: string;
  notes: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  orderDate: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingStatus: ShippingStatus;
  assignedEmployee: string;
  lastUpdated: string;

  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingCost: number;
  tax: number;
  total: number;

  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  payment: OrderPayment;
  shipping: OrderShipping;
  timeline: TimelineEvent[];
  notes: string;
}

// ─── Business rules (same values the orders list data was generated with) ───
export const TAX_RATE = 0.08;

export const SHIPPING_COSTS: Record<ShippingMethod, number> = {
  Standard: 12,
  Express: 25,
  Overnight: 45,
  Pickup: 0,
};

export const LOW_STOCK_THRESHOLD = 10;   // matches Products (stock > 0 && <= 10)
export const NO_TRACKING = '—';          // sentinel already used by the orders list data

export const PAYMENT_METHODS: PaymentMethod[] =
  ['Credit Card', 'PayPal', 'Cash on Delivery', 'Bank Transfer', 'Wallet'];
export const SHIPPING_METHODS: ShippingMethod[] =
  ['Standard', 'Express', 'Overnight', 'Pickup'];
export const SHIPPING_COMPANIES = ['DHL Express', 'FedEx', 'Aramex', 'Local Courier'];
export const EMPLOYEES = ['Ayoub H.', 'Sara I.', 'Karim M.', 'Unassigned'];

// Maps ShippingMethod (data value) -> translation key segment, for display only.
export const SHIPPING_METHOD_KEY_MAP: Record<ShippingMethod, string> = {
  Standard: 'standard', Express: 'express', Overnight: 'overnight', Pickup: 'pickup',
};

// ─── Catalog entry offered by the line-item product picker ──────────────────
export interface OrderCatalogProduct {
  sku: string;
  name: string;
  image: string;
  price: number;
  stock: number;
}

// ─── Form contracts ─────────────────────────────────────────────────────────
export interface OrderFormItem {
  uid: string;                 // stable id for @for tracking (reused as OrderLineItem.id when kept)
  sku: string;                 // '' until a product is picked
  name: string;
  image: string;
  price: number;               // unit price snapshot
  quantity: number | null;
  discount: number | null;     // currency amount for the whole line (same meaning as OrderLineItem.discount)
}

export interface OrderFormValue {
  customerId: string;
  items: OrderFormItem[];
  extraDiscount: number | null;   // order-level discount on top of line discounts
  couponCode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingCompany: string;
  trackingNumber: string;
  estimatedDelivery: string;      // yyyy-MM-dd
  shippingAddress: OrderAddress;
  billingSameAsShipping: boolean;
  billingAddress: OrderAddress;
  assignedEmployee: string;
  notes: string;
}

export interface OrderTotals {
  subtotal: number;
  lineDiscounts: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
}

// Which field groups of an existing order are LOCKED, derived from its status
// and payment state (see OrderService.lockStateFor). `true` = locked.
export interface OrderLockState {
  /** delivered / cancelled / refunded: only notes + assignee remain editable */
  readOnly: boolean;
  /** items, discounts, coupon and shipping method (anything that changes the total) */
  pricing: boolean;
  /** shipping + billing address */
  addresses: boolean;
  /** payment method / payment status */
  payment: boolean;
  /** shipping company, tracking number, estimated delivery */
  shipment: boolean;
}