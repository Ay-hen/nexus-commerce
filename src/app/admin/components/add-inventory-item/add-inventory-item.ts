// add-inventory-item.ts
import {
  Component, Input, Output, EventEmitter, signal, computed, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface NewInventoryItemPayload {
  name: string;
  sku: string;
  barcode: string;
  image: string;
  category: string;
  warehouse: string;
  supplier: string;
  initialStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  reorderQty: number;
}

interface NewItemForm {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  warehouse: string;
  supplier: string;
  initialStock: number | null;
  minStock: number | null;
  maxStock: number | null;
  unitCost: number | null;
  reorderQty: number | null;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const DEFAULT_FORM: NewItemForm = {
  name: '', sku: '', barcode: '', category: '', warehouse: '', supplier: '',
  initialStock: null, minStock: null, maxStock: null, unitCost: null, reorderQty: null,
};

function slugCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
}

@Component({
  selector: 'app-add-inventory-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-inventory-item.html',
  styleUrl: './add-inventory-item.scss',
})
export class AddInventoryItem {

  // ── Inputs / Outputs ────────────────────────────────────────────────────
  @Input() categories: string[] = ['Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion'];
  @Input() warehouses: string[] = ['Main Warehouse', 'North DC', 'South DC', 'East Hub'];
  @Input() suppliers: string[] = ['TechSource Inc', 'Global Distributors', 'Prime Supply Co', 'Apex Trading'];
  @Input() existingSkus: string[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() created = new EventEmitter<NewInventoryItemPayload>();

  // ── State ─────────────────────────────────────────────────────────────────
  form = signal<NewItemForm>({ ...DEFAULT_FORM });
  imagePreview = signal<string | null>(null);
  dragOver = signal(false);

  skuTouched = signal(false);
  isSaving = signal(false);
  showSuccess = signal(false);
  errors = signal<Record<string, string>>({});

  // ── Computed ──────────────────────────────────────────────────────────────
  computedSku = computed(() => {
    const code = slugCode(this.form().name);
    return code ? `${code}-${Math.floor(1000 + Math.random() * 9000)}` : '';
  });

  initialStockNum = computed(() => Math.max(0, this.form().initialStock ?? 0));
  unitCostNum     = computed(() => Math.max(0, this.form().unitCost ?? 0));
  inventoryValue  = computed(() => this.initialStockNum() * this.unitCostNum());

  stockPercent = computed(() => {
    const max = this.form().maxStock ?? 0;
    if (max <= 0) return 0;
    return Math.min(100, Math.round((this.initialStockNum() / max) * 100));
  });

  previewStatus = computed<'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'critical'>(() => {
    const stock = this.initialStockNum();
    const min = this.form().minStock ?? 0;
    const max = this.form().maxStock ?? 0;
    if (stock === 0) return 'out-of-stock';
    if (min > 0 && stock <= min * 0.5) return 'critical';
    if (min > 0 && stock <= min) return 'low-stock';
    if (max > 0 && stock >= max) return 'overstock';
    return 'in-stock';
  });

  statusLabel = computed(() => {
    const map: Record<string, string> = {
      'in-stock': 'In Stock', 'low-stock': 'Low Stock', 'out-of-stock': 'Out of Stock',
      'overstock': 'Overstock', 'critical': 'Critical',
    };
    return map[this.previewStatus()];
  });

  canSave = computed(() => {
    const f = this.form();
    return !!f.name.trim() &&
      !!f.category &&
      !!f.warehouse &&
      f.maxStock !== null && f.maxStock > 0 &&
      !this.isSaving();
  });

  // ── Form helpers ──────────────────────────────────────────────────────────
  patchForm(patch: Partial<NewItemForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
    const keys = Object.keys(patch);
    this.errors.update(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }

  onSkuInput(value: string): void {
    this.skuTouched.set(true);
    this.patchForm({ sku: value.toUpperCase() });
  }

  generateSku(): void {
    this.skuTouched.set(true);
    this.patchForm({ sku: this.computedSku() });
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  private validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG, or WebP images are supported.';
    if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Image exceeds the 5 MB limit.';
    return null;
  }

  async onImageSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    await this.setImage(file);
  }

  async onImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.setImage(file);
  }

  private async setImage(file: File): Promise<void> {
    const err = this.validateImageFile(file);
    if (err) { this.errors.update(e => ({ ...e, image: err })); return; }
    const base64 = await this.fileToBase64(file);
    this.imagePreview.set(base64);
    this.errors.update(e => { const n = { ...e }; delete n['image']; return n; });
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver.set(true); }
  onDragLeave(): void { this.dragOver.set(false); }
  removeImage(): void { this.imagePreview.set(null); }

  // ── Validation ────────────────────────────────────────────────────────────
  private validate(): boolean {
    const f = this.form();
    const errs: Record<string, string> = {};

    if (!f.name.trim()) errs['name'] = 'Product name is required.';
    if (!f.category) errs['category'] = 'Select a category.';
    if (!f.warehouse) errs['warehouse'] = 'Select a warehouse.';

    const sku = f.sku.trim() || this.computedSku();
    if (sku && this.existingSkus.includes(sku)) errs['sku'] = 'This SKU already exists.';

    if (f.initialStock !== null && f.initialStock < 0) errs['initialStock'] = 'Stock cannot be negative.';
    if (f.minStock !== null && f.maxStock !== null && f.minStock > f.maxStock) {
      errs['minStock'] = 'Minimum stock cannot exceed maximum stock.';
    }
    if (!f.maxStock || f.maxStock <= 0) errs['maxStock'] = 'Maximum stock is required.';
    if (f.unitCost !== null && f.unitCost < 0) errs['unitCost'] = 'Unit cost cannot be negative.';

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Reset / close / cancel ───────────────────────────────────────────────
  reset(): void {
    this.form.set({ ...DEFAULT_FORM });
    this.imagePreview.set(null);
    this.skuTouched.set(false);
    this.errors.set({});
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
    if (!this.validate()) return;

    this.isSaving.set(true);
    const f = this.form();

    const payload: NewInventoryItemPayload = {
      name: f.name.trim(),
      sku: f.sku.trim() || this.computedSku(),
      barcode: f.barcode.trim(),
      image: this.imagePreview() ?? '',
      category: f.category,
      warehouse: f.warehouse,
      supplier: f.supplier,
      initialStock: this.initialStockNum(),
      minStock: Math.max(0, f.minStock ?? 0),
      maxStock: Math.max(1, f.maxStock ?? 1),
      unitCost: this.unitCostNum(),
      reorderQty: Math.max(1, f.reorderQty ?? Math.max(10, f.minStock ?? 10)),
    };

    setTimeout(() => {
      this.isSaving.set(false);
      this.showSuccess.set(true);
      this.created.emit(payload);

      setTimeout(() => this.closed.emit(), 1100);
    }, 800);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasError(field: string): boolean { return !!this.errors()[field]; }
  errorMsg(field: string): string { return this.errors()[field] ?? ''; }

  formatCurrency(v: number): string { return '$' + v.toLocaleString(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.attemptClose(); }
}