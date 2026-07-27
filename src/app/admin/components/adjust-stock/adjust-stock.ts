// adjust-stock-modal.ts
import {
  Component, Input, Output, EventEmitter, signal, computed, HostListener, OnChanges, SimpleChanges, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';

// ─── Types ──────────────────────────────────────────────────────────────────
export type AdjustmentType =
  | 'increase' | 'decrease' | 'correction' | 'transfer'
  | 'return' | 'damaged' | 'lost' | 'initial';

export type AdjustmentReason =
  | 'customer-return' | 'supplier-delivery' | 'stock-correction' | 'damaged'
  | 'lost' | 'warehouse-transfer' | 'inventory-count' | 'other';

export interface StockMovementItem {
  id: string;
  date: string;               // ISO datetime
  type: 'increase' | 'decrease' | 'transfer' | 'correction';
  quantity: number;
  user: string;
  reason: string;
}

export interface AdjustStockProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
  category: string;
  warehouse: string;
  currentStock: number;
  reserved: number;
  incoming: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  lastUpdated: string;         // ISO datetime
  movements: StockMovementItem[];
}

export interface StockAdjustmentPayload {
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: AdjustmentReason;
  destinationWarehouse: string | null;
  referenceNumber: string;
  notes: string;
  adjustmentDate: string;      // yyyy-mm-dd
  performedBy: string;
  resultingStock: number;
  difference: number;
}

interface AdjustFormState {
  type: AdjustmentType;
  quantity: number | null;
  reason: AdjustmentReason;
  destinationWarehouse: string;
  referenceNumber: string;
  notes: string;
  adjustmentDate: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_FORM: AdjustFormState = {
  type: 'increase',
  quantity: null,
  reason: 'supplier-delivery',
  destinationWarehouse: '',
  referenceNumber: '',
  notes: '',
  adjustmentDate: TODAY,
};

// Maps AdjustmentType -> the camelCase key under adjustStock.types.*
const TYPE_KEY_MAP: Record<AdjustmentType, string> = {
  increase: 'increase', decrease: 'decrease', correction: 'correction', transfer: 'transfer',
  return: 'return', damaged: 'damaged', lost: 'lost', initial: 'initial',
};

// Maps AdjustmentReason -> the camelCase key under adjustStock.reasons.*
const REASON_KEY_MAP: Record<AdjustmentReason, string> = {
  'customer-return': 'customerReturn',
  'supplier-delivery': 'supplierDelivery',
  'stock-correction': 'stockCorrection',
  'damaged': 'damaged',
  'lost': 'lost',
  'warehouse-transfer': 'warehouseTransfer',
  'inventory-count': 'inventoryCount',
  'other': 'other',
};

@Component({
  selector: 'app-adjust-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './adjust-stock.html',
  styleUrl: './adjust-stock.scss',
})
export class AdjustStock implements OnChanges {
  protected lang = inject(LanguageService);

  // ── Inputs / Outputs ────────────────────────────────────────────────────
  @Input() product: AdjustStockProduct | null = null;
  @Input() isLoading = false;
  @Input() currentUser = 'You';
  @Input() warehouses: string[] = ['Main Warehouse', 'North DC', 'South DC', 'East Hub'];

  @Output() closed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() saved = new EventEmitter<StockAdjustmentPayload>();

  // ── State ─────────────────────────────────────────────────────────────────
  form = signal<AdjustFormState>({ ...DEFAULT_FORM });
  isSaving = signal(false);
  showSuccess = signal(false);
  errorMsg = signal<string | null>(null);

  // ── Static option lists — label is now a translation key ─────────────────
  adjustmentTypes: { key: AdjustmentType; label: string; icon: string; sign: 'pos' | 'neg' | 'set' }[] = [
    { key: 'increase',   label: 'adjustStock.types.increase',   icon: 'plus',     sign: 'pos' },
    { key: 'decrease',   label: 'adjustStock.types.decrease',   icon: 'minus',    sign: 'neg' },
    { key: 'correction', label: 'adjustStock.types.correction', icon: 'check',    sign: 'set' },
    { key: 'transfer',   label: 'adjustStock.types.transfer',   icon: 'transfer', sign: 'neg' },
    { key: 'return',     label: 'adjustStock.types.return',     icon: 'undo',     sign: 'pos' },
    { key: 'damaged',    label: 'adjustStock.types.damaged',    icon: 'alert',    sign: 'neg' },
    { key: 'lost',       label: 'adjustStock.types.lost',       icon: 'x',        sign: 'neg' },
    { key: 'initial',    label: 'adjustStock.types.initial',    icon: 'flag',     sign: 'set' },
  ];

  reasonOptions: { key: AdjustmentReason; label: string }[] = [
    { key: 'customer-return',    label: 'adjustStock.reasons.customerReturn' },
    { key: 'supplier-delivery',  label: 'adjustStock.reasons.supplierDelivery' },
    { key: 'stock-correction',   label: 'adjustStock.reasons.stockCorrection' },
    { key: 'damaged',            label: 'adjustStock.reasons.damaged' },
    { key: 'lost',               label: 'adjustStock.reasons.lost' },
    { key: 'warehouse-transfer', label: 'adjustStock.reasons.warehouseTransfer' },
    { key: 'inventory-count',    label: 'adjustStock.reasons.inventoryCount' },
    { key: 'other',              label: 'adjustStock.reasons.other' },
  ];

  // ── Derived: current type metadata ───────────────────────────────────────
  activeTypeMeta = computed(() =>
    this.adjustmentTypes.find(t => t.key === this.form().type) ?? this.adjustmentTypes[0]
  );

  isSetType = computed(() => this.activeTypeMeta().sign === 'set');
  isTransfer = computed(() => this.form().type === 'transfer');

  // ── Calculations ──────────────────────────────────────────────────────────
  quantityNum = computed(() => Math.max(0, this.form().quantity ?? 0));

  currentStock = computed(() => this.product?.currentStock ?? 0);

  signedDelta = computed(() => {
    const qty = this.quantityNum();
    const sign = this.activeTypeMeta().sign;
    if (sign === 'pos') return qty;
    if (sign === 'neg') return -qty;
    return qty - this.currentStock();
  });

  resultingStock = computed(() => Math.max(0, this.currentStock() + this.signedDelta()));
  difference = computed(() => this.resultingStock() - this.currentStock());

  previewState = computed<'positive' | 'negative' | 'none'>(() => {
    const d = this.difference();
    if (d > 0) return 'positive';
    if (d < 0) return 'negative';
    return 'none';
  });

  availableStock = computed(() => Math.max(0, this.currentStock() - (this.product?.reserved ?? 0)));
  inventoryValue = computed(() => this.currentStock() * (this.product?.unitCost ?? 0));

  // ── Validation ────────────────────────────────────────────────────────────
  willBeZero       = computed(() => this.resultingStock() === 0 && this.currentStock() > 0);
  belowMinimum     = computed(() => !!this.product && this.resultingStock() > 0 && this.resultingStock() < this.product.minStock);
  exceedsAvailable = computed(() => {
    const sign = this.activeTypeMeta().sign;
    if (sign !== 'neg') return false;
    return this.quantityNum() > this.availableStock();
  });

  needsWarehouse = computed(() => this.isTransfer() && !this.form().destinationWarehouse);

  canSave = computed(() =>
    !!this.product &&
    this.quantityNum() > 0 &&
    !this.needsWarehouse() &&
    !this.isSaving()
  );

  destinationWarehouses = computed(() =>
    this.warehouses.filter(w => w !== this.product?.warehouse)
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.reset();
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  patchForm(patch: Partial<AdjustFormState>): void {
    this.form.update(f => ({ ...f, ...patch }));
    this.errorMsg.set(null);
  }

  selectType(type: AdjustmentType): void {
    this.patchForm({ type, destinationWarehouse: type === 'transfer' ? this.form().destinationWarehouse : '' });
  }

  incrementQty(step = 1): void {
    this.patchForm({ quantity: this.quantityNum() + step });
  }

  decrementQty(step = 1): void {
    this.patchForm({ quantity: Math.max(0, this.quantityNum() - step) });
  }

  // ── Quick actions ─────────────────────────────────────────────────────────
  setToMinimum(): void {
    if (!this.product) return;
    this.patchForm({ type: 'correction', quantity: this.product.minStock });
  }

  setToMaximum(): void {
    if (!this.product) return;
    this.patchForm({ type: 'correction', quantity: this.product.maxStock });
  }

  quickRestock(): void {
    if (!this.product) return;
    const target = Math.max(this.product.minStock * 2, this.product.maxStock - this.product.currentStock);
    this.patchForm({ type: 'increase', quantity: target, reason: 'supplier-delivery' });
  }

  clearStock(): void {
    this.patchForm({ type: 'correction', quantity: 0, reason: 'stock-correction' });
  }

  autoFill(): void {
    if (!this.product) return;
    this.patchForm({
      type: 'increase',
      quantity: Math.max(10, this.product.minStock),
      reason: 'supplier-delivery',
      referenceNumber: 'PO-' + Math.floor(1000 + Math.random() * 9000),
      notes: this.lang.translate('adjustStock.autoFillNote'),
    });
  }

  // ── Reset / close / cancel ───────────────────────────────────────────────
  reset(): void {
    this.form.set({ ...DEFAULT_FORM, destinationWarehouse: '' });
    this.errorMsg.set(null);
    this.showSuccess.set(false);
  }

  attemptClose(): void {
    if (this.isSaving()) return;
    this.closed.emit();
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.cancelled.emit();
    this.closed.emit();
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  save(): void {
    if (!this.canSave() || !this.product) return;

    if (this.exceedsAvailable()) {
      this.errorMsg.set(this.lang.translate('adjustStock.errors.exceedsAvailableSave'));
      return;
    }

    this.isSaving.set(true);
    this.errorMsg.set(null);

    const f = this.form();
    const payload: StockAdjustmentPayload = {
      productId: this.product.id,
      type: f.type,
      quantity: this.quantityNum(),
      reason: f.reason,
      destinationWarehouse: this.isTransfer() ? f.destinationWarehouse : null,
      referenceNumber: f.referenceNumber,
      notes: f.notes,
      adjustmentDate: f.adjustmentDate,
      performedBy: this.currentUser,
      resultingStock: this.resultingStock(),
      difference: this.difference(),
    };

    setTimeout(() => {
      this.isSaving.set(false);
      this.showSuccess.set(true);
      this.saved.emit(payload);

      setTimeout(() => this.closed.emit(), 1100);
    }, 800);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(v: number): string { return this.lang.formatCurrency(v); }

  formatDateTime(iso: string): string {
    return this.lang.formatDateTime(iso);
  }

  typeLabel(type: string): string {
    return this.lang.translate('adjustStock.types.' + TYPE_KEY_MAP[type as AdjustmentType]);
  }

  reasonLabel(key: string): string {
    const mapped = REASON_KEY_MAP[key as AdjustmentReason];
    return mapped ? this.lang.translate('adjustStock.reasons.' + mapped) : key;
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.attemptClose(); }
}