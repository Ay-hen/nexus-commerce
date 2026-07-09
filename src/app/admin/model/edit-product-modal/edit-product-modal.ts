// edit-product-modal.component.ts
// Place at: src/app/admin/edit-product-modal/edit-product-modal.component.ts
// (same folder depth as edit-product/ and products/ — adjust relative imports if different)

import {
  Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy,
  Output, SimpleChanges, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductFormService } from '../../services/product-form';
import {
  ProductImage, ColorVariant, MAX_IMAGES_PER_SLOT,
} from '../../model/product-image.model';
import { AdminProduct } from '../../model/admin-models.model';

interface ProductForm {
  name: string;
  brand: string;
  category: string;
  description: string;
  specifications: string;
  tagsRaw: string;
  price: number | null;
  originalPrice: number | null;
  discount: number | null;
  stock: number | null;
  sku: string;
  barcode: string;
  weight: number | null;
  dimLength: number | null;
  dimWidth: number | null;
  dimHeight: number | null;
  warranty: string;
  featured: boolean;
  isNew: boolean;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  status: 'active' | 'draft';
}

@Component({
  selector: 'app-edit-product-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-product-modal.html',
  styleUrl: './edit-product-modal.scss',
})
export class EditProductModal implements OnChanges, OnDestroy {
  private pfs = inject(ProductFormService);

  // The full product record from the list — passed in directly so the modal
  // is always editing the exact row that was clicked (no re-fetch/mismatch).
  @Input({ required: true }) product!: AdminProduct;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AdminProduct>();

  isSubmitting = signal(false);
  submitStatus = signal<'idle' | 'success'>('idle');

  form = signal<ProductForm>(this.emptyForm());

  hasColorVariants = signal(false);
  defaultImages = signal<ProductImage[]>([]);
  colorVariants = signal<ColorVariant[]>([]);
  dragOverSlot = signal<string | null>(null);

  errors = signal<Record<string, string>>({});
  lightboxSrc = signal<string | null>(null);

  categories = [
    'Electronics', 'Smartphones', 'Laptops', 'Audio',
    'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion',
  ];
  warrantyOptions = ['No warranty', '6 months', '1 year', '2 years', '3 years', '5 years'];

  computedDiscount = computed(() =>
    this.pfs.computeDiscount(this.form().price, this.form().originalPrice)
  );
  computedSlug = computed(() => this.pfs.generateSlug(this.form().name));

  totalImages = computed(() => {
    if (this.hasColorVariants()) {
      return this.colorVariants().reduce((sum, v) => sum + v.images.length, 0);
    }
    return this.defaultImages().length;
  });

  private emptyForm(): ProductForm {
    return {
      name: '', brand: '', category: '', description: '', specifications: '',
      tagsRaw: '', price: null, originalPrice: null, discount: null,
      stock: null, sku: '', barcode: '', weight: null,
      dimLength: null, dimWidth: null, dimHeight: null, warranty: 'No warranty',
      featured: false, isNew: false,
      seoTitle: '', seoDescription: '', slug: '',
      status: 'active',
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.populateFromProduct(this.product);
      document.body.style.overflow = 'hidden';
    }
  }

  private populateFromProduct(product: AdminProduct): void {
    this.form.set({
      name:           product.name,
      brand:          product.brand,
      category:       product.category,
      description:    `Premium ${product.name} — a flagship product from ${product.brand}.`,
      specifications: 'Driver: 40mm · Frequency: 4Hz–40kHz · Battery: 30hrs',
      tagsRaw:        product.category.toLowerCase() + ', ' + product.brand.toLowerCase(),
      price:          product.price,
      originalPrice:  Math.round(product.price * 1.25),
      discount:       null,
      stock:          product.stock,
      sku:            product.sku,
      barcode:        '',
      weight:         null,
      dimLength:      null,
      dimWidth:       null,
      dimHeight:      null,
      warranty:       '1 year',
      featured:       product.featured,
      isNew:          false,
      seoTitle:       product.name,
      seoDescription: '',
      slug:           this.pfs.generateSlug(product.name),
      status:         product.status === 'active' ? 'active' : 'draft',
    });

    const existingImg = this.pfs.imageFromBase64(product.image, product.name + '.jpg');
    existingImg.preview = product.image;
    this.defaultImages.set([existingImg]);
    this.hasColorVariants.set(false);
    this.colorVariants.set([]);
    this.errors.set({});
    this.submitStatus.set('idle');
  }

  // ── Form patch ────────────────────────────────────────────────────────────
  patchForm(patch: Partial<ProductForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
    const keys = Object.keys(patch);
    this.errors.update(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }

  // ── Default images ────────────────────────────────────────────────────────
  async onDefaultImageSelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    await this.addDefaultImages(files);
    (event.target as HTMLInputElement).value = '';
  }

  async onDefaultImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.addDefaultImages(files);
  }

  private async addDefaultImages(files: File[]): Promise<void> {
    const remaining = MAX_IMAGES_PER_SLOT - this.defaultImages().length;
    const toProcess = files.slice(0, remaining);
    const imageErrors: string[] = [];

    for (const file of toProcess) {
      const err = this.pfs.validateImageFile(file);
      if (err) { imageErrors.push(err); continue; }
      const base64 = await this.pfs.fileToBase64(file);
      this.defaultImages.update(list => [...list, this.pfs.buildProductImage(file, base64)]);
    }

    if (imageErrors.length) {
      this.errors.update(e => ({ ...e, images: imageErrors.join(' ') }));
    } else {
      this.errors.update(e => { const n = { ...e }; delete n['images']; return n; });
    }
  }

  removeDefaultImage(id: string): void {
    this.defaultImages.update(list => list.filter(img => img.id !== id));
  }

  replaceDefaultImage(id: string): void {
    this.defaultImages.update(list => list.filter(img => img.id !== id));
  }

  // ── Color variants ────────────────────────────────────────────────────────
  addColorVariant(): void {
    this.colorVariants.update(list => [
      ...list,
      { id: crypto.randomUUID(), colorName: '', colorHex: '#000000', images: [] },
    ]);
  }

  removeColorVariant(id: string): void {
    this.colorVariants.update(list => list.filter(v => v.id !== id));
  }

  patchVariant(id: string, patch: Partial<ColorVariant>): void {
    this.colorVariants.update(list => list.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  async onVariantImageSelect(variantId: string, event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    await this.addVariantImages(variantId, files);
    (event.target as HTMLInputElement).value = '';
  }

  async onVariantImageDrop(variantId: string, event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.addVariantImages(variantId, files);
  }

  private async addVariantImages(variantId: string, files: File[]): Promise<void> {
    const variant = this.colorVariants().find(v => v.id === variantId);
    if (!variant) return;
    const remaining = MAX_IMAGES_PER_SLOT - variant.images.length;
    const imageErrors: string[] = [];

    for (const file of files.slice(0, remaining)) {
      const err = this.pfs.validateImageFile(file);
      if (err) { imageErrors.push(err); continue; }
      const base64 = await this.pfs.fileToBase64(file);
      const img = this.pfs.buildProductImage(file, base64);
      this.colorVariants.update(list =>
        list.map(v => v.id === variantId ? { ...v, images: [...v.images, img] } : v)
      );
    }

    if (imageErrors.length) {
      this.errors.update(e => ({ ...e, [`variant_${variantId}_images`]: imageErrors.join(' ') }));
    }
  }

  removeVariantImage(variantId: string, imageId: string): void {
    this.colorVariants.update(list =>
      list.map(v => v.id === variantId ? { ...v, images: v.images.filter(img => img.id !== imageId) } : v)
    );
  }

  toggleColorVariants(): void {
    this.hasColorVariants.update(v => !v);
    if (this.hasColorVariants() && this.colorVariants().length === 0) {
      this.addColorVariant();
    }
  }

  onDragOver(event: DragEvent, slotId: string): void {
    event.preventDefault();
    this.dragOverSlot.set(slotId);
  }
  onDragLeave(): void { this.dragOverSlot.set(null); }

  openLightbox(src: string): void { this.lightboxSrc.set(src); }
  closeLightbox(): void { this.lightboxSrc.set(null); }

  // ── Validation ────────────────────────────────────────────────────────────
  private validateForm(): boolean {
    const f = this.form();
    const errs = this.pfs.validate(
      {
        name: f.name, brand: f.brand, category: f.category,
        description: f.description, price: f.price, stock: f.stock,
        sku: f.sku, discount: f.discount,
      },
      this.hasColorVariants(),
      this.defaultImages(),
      this.colorVariants(),
    );
    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async saveDraft(): Promise<void> {
    this.isSubmitting.set(true);
    await this.submit('draft');
  }

  async saveChanges(): Promise<void> {
    if (!this.validateForm()) {
      this.errors.update(e => e); // no-op, template highlights fields
      queueMicrotask(() =>
        document.querySelector('.epm-dialog .field--error')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      );
      return;
    }
    this.isSubmitting.set(true);
    await this.submit(this.form().status);
  }

  private async submit(status: 'active' | 'draft'): Promise<void> {
    // Replace with:
    // this.http.put(`/api/admin/products/${this.product.id}`, payload, { headers: authHeaders })
    await new Promise(r => setTimeout(r, 900));

    const f = this.form();
    const image = this.hasColorVariants()
      ? (this.colorVariants()[0]?.images[0]?.preview ?? this.product.image)
      : (this.defaultImages()[0]?.preview ?? this.product.image);

    const updated: AdminProduct = {
      ...this.product,
      name:     f.name.trim(),
      brand:    f.brand.trim(),
      category: f.category,
      price:    f.price ?? this.product.price,
      stock:    f.stock ?? this.product.stock,
      status,
      sku:      f.sku.trim(),
      featured: f.featured,
      image,
    };

    this.isSubmitting.set(false);
    this.submitStatus.set('success');
    setTimeout(() => this.saved.emit(updated), 700);
  }

  // ── Close handling ────────────────────────────────────────────────────────
  requestClose(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxSrc()) { this.closeLightbox(); return; }
    this.requestClose();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasError(field: string): boolean { return !!this.errors()[field]; }
  errorMsg(field: string): string { return this.errors()[field] ?? ''; }
  formatBytes(b: number): string { return this.pfs.formatBytes(b); }
  trackById(_: number, item: { id: string }): string { return item.id; }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}