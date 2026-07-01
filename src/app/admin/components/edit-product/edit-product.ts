// edit-product.component.ts
import {
  Component, signal, computed, inject, OnInit, OnDestroy, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProductFormService } from '../../services/product-form';
import {
  ProductImage, ColorVariant, ProductFormPayload, MAX_IMAGES_PER_SLOT,
} from '../../model/product-image.model';
import { AdminProduct } from '../../model/admin-models.model';

// ─── Extended form state ──────────────────────────────────────────────────────
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
  badge: 'new' | 'sale' | null;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  status: 'active' | 'draft';
}

// ─── Mock product store (replace with HTTP service) ───────────────────────────
const MOCK_PRODUCTS: AdminProduct[] = [
  { id: 1, name: 'WH-XM6 Wireless ANC',  brand: 'Sony',  category: 'Audio',       price: 249,  stock: 12, status: 'active', sales: 284, image: '/products/headphones.png',    sku: 'SONY-WH-XM6', featured: true  },
  { id: 2, name: 'Ultra Watch Series 3',  brand: 'Apple', category: 'Watches',     price: 189,  stock: 18, status: 'active', sales: 87,  image: '/products/appel watch.png',   sku: 'APL-UW-S3',   featured: false },
  { id: 3, name: 'AirPods Pro 2nd Gen',   brand: 'Apple', category: 'Electronics', price: 199,  stock: 25, status: 'active', sales: 217, image: '/products/airpods pro w1.png',sku: 'APL-APP-2G',  featured: true  },
  { id: 4, name: 'MacBook Pro M3',        brand: 'Apple', category: 'Laptops',     price: 1999, stock: 5,  status: 'active', sales: 98,  image: '/products/macbook pro 13.png',sku: 'APL-MBP-M3',  featured: true  },
  { id: 5, name: 'Galaxy S24 Ultra',      brand: 'Samsung', category: 'Smartphones', price: 1099, stock: 8, status: 'active', sales: 143, image: '/products/samsung galxy s24 ultra silver.png', sku: 'SAM-S24U', featured: false },
];

@Component({
  selector: 'app-edit-product',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-product.html',
  styleUrl: './edit-product.scss',
})
export class EditProduct implements OnInit, OnDestroy {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  readonly pfs   = inject(ProductFormService);

  // ── Route param ───────────────────────────────────────────────────────────
  productId = signal<number | null>(null);

  // ── Loading / saving state ────────────────────────────────────────────────
  isLoadingProduct = signal(true);
  isSubmitting     = signal(false);
  submitStatus     = signal<'idle' | 'success' | 'error'>('idle');
  loadError        = signal<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  form = signal<ProductForm>({
    name: '', brand: '', category: '', description: '', specifications: '',
    tagsRaw: '', price: null, originalPrice: null, discount: null,
    stock: null, sku: '', barcode: '', weight: null,
    dimLength: null, dimWidth: null, dimHeight: null, warranty: 'No warranty',
    featured: false, isNew: false, badge: null,
    seoTitle: '', seoDescription: '', slug: '',
    status: 'active',
  });

  // ── Image state ────────────────────────────────────────────────────────────
  hasColorVariants = signal(false);
  defaultImages    = signal<ProductImage[]>([]);
  colorVariants    = signal<ColorVariant[]>([]);
  dragOverSlot     = signal<string | null>(null);

  // ── Validation ────────────────────────────────────────────────────────────
  errors = signal<Record<string, string>>({});

  // ── Lightbox / image preview ──────────────────────────────────────────────
  lightboxSrc  = signal<string | null>(null);

  // ── Static options ────────────────────────────────────────────────────────
  categories = [
    'Electronics', 'Smartphones', 'Laptops', 'Audio',
    'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion',
  ];
  warrantyOptions = ['No warranty', '6 months', '1 year', '2 years', '3 years', '5 years'];

  // ── Computed ──────────────────────────────────────────────────────────────
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

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productId.set(id);
    this.loadProduct(id);
  }

  private loadProduct(id: number): void {
    this.isLoadingProduct.set(true);

    // Replace with:
    // this.http.get<ProductFormPayload>(`/api/admin/products/${id}`)
    //   .subscribe({ next: p => this.populateForm(p), error: () => this.loadError.set('Failed to load product.') });
    setTimeout(() => {
      const found = MOCK_PRODUCTS.find(p => p.id === id);
      if (!found) {
        this.loadError.set('Product not found.');
        this.isLoadingProduct.set(false);
        return;
      }
      this.populateFromMock(found);
      this.isLoadingProduct.set(false);
    }, 600);
  }

  /** Populate form from mock AdminProduct (replace with ProductFormPayload from backend) */
  private populateFromMock(product: AdminProduct): void {
    this.form.set({
      name:           product.name,
      brand:          product.brand,
      category:       product.category,
      description:    `Premium ${product.name} — a flagship product from ${product.brand}.`,
      specifications: 'Driver: 40mm · Frequency: 4Hz–40kHz · Battery: 30hrs',
      tagsRaw:        product.category.toLowerCase() + ', ' + product.brand.toLowerCase(),
      price:          product.price,
      originalPrice:  Math.round(product.price * 1.25),
      discount:       null,   // will be computed
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
      badge:          null,
      seoTitle:       product.name,
      seoDescription: '',
      slug:           this.pfs.generateSlug(product.name),
      status:         product.status as 'active' | 'draft',
    });

    // Pre-load the existing product image as a base64 stub
    // In real integration: backend sends actual base64 strings in the payload
    const existingImg = this.pfs.imageFromBase64(
      product.image,            // in real code this is base64; here it's a URL path used as preview
      product.name + '.jpg'
    );
    // Override preview with the URL so the existing image displays correctly in the admin
    existingImg.preview = product.image;
    this.defaultImages.set([existingImg]);
    this.hasColorVariants.set(false);
  }

  /** Populate form from real backend ProductFormPayload */
  populateFromPayload(payload: ProductFormPayload): void {
    this.form.set({
      name:           payload.name,
      brand:          payload.brand,
      category:       payload.category,
      description:    payload.description,
      specifications: payload.specifications,
      tagsRaw:        payload.tags.join(', '),
      price:          payload.price,
      originalPrice:  payload.originalPrice,
      discount:       payload.discount,
      stock:          payload.stock,
      sku:            payload.sku,
      barcode:        payload.barcode,
      weight:         payload.weight,
      dimLength:      payload.dimensions.length,
      dimWidth:       payload.dimensions.width,
      dimHeight:      payload.dimensions.height,
      warranty:       payload.warranty,
      featured:       payload.featured,
      isNew:          payload.isNew,
      badge:          payload.badge,
      seoTitle:       payload.seoTitle,
      seoDescription: payload.seoDescription,
      slug:           payload.slug,
      status:         payload.status,
    });
    this.hasColorVariants.set(payload.hasColorVariants);
    this.defaultImages.set(payload.defaultImages);
    this.colorVariants.set(payload.colorVariants);
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
      this.defaultImages.update(list => [
        ...list,
        this.pfs.buildProductImage(file, base64),
      ]);
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
    // triggered by label click; file input change calls this + onDefaultImageSelect
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
    this.colorVariants.update(list =>
      list.map(v => v.id === id ? { ...v, ...patch } : v)
    );
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
      list.map(v =>
        v.id === variantId ? { ...v, images: v.images.filter(img => img.id !== imageId) } : v
      )
    );
  }

  // ── Color variant toggle ──────────────────────────────────────────────────
  toggleColorVariants(): void {
    this.hasColorVariants.update(v => !v);
    if (this.hasColorVariants() && this.colorVariants().length === 0) {
      this.addColorVariant();
    }
  }

  // ── Drag events ───────────────────────────────────────────────────────────
  onDragOver(event: DragEvent, slotId: string): void {
    event.preventDefault();
    this.dragOverSlot.set(slotId);
  }
  onDragLeave(): void { this.dragOverSlot.set(null); }

  // ── Lightbox ─────────────────────────────────────────────────────────────
  openLightbox(src: string): void  { this.lightboxSrc.set(src); }
  closeLightbox(): void            { this.lightboxSrc.set(null); }

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

  // ── Build payload ─────────────────────────────────────────────────────────
  private buildPayload(status: 'active' | 'draft'): ProductFormPayload {
    const f = this.form();
    return {
      name:            f.name.trim(),
      brand:           f.brand.trim(),
      category:        f.category,
      description:     f.description.trim(),
      specifications:  f.specifications.trim(),
      tags:            f.tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
      price:           f.price ?? 0,
      originalPrice:   f.originalPrice ?? f.price ?? 0,
      discount:        f.discount ?? this.computedDiscount(),
      stock:           f.stock ?? 0,
      sku:             f.sku.trim(),
      barcode:         f.barcode.trim(),
      weight:          f.weight ?? 0,
      dimensions:      { length: f.dimLength ?? 0, width: f.dimWidth ?? 0, height: f.dimHeight ?? 0 },
      warranty:        f.warranty,
      hasColorVariants: this.hasColorVariants(),
      defaultImages:   this.defaultImages(),
      colorVariants:   this.colorVariants(),
      status,
      featured:        f.featured,
      isNew:           f.isNew,
      badge:           f.badge,
      seoTitle:        f.seoTitle || f.name,
      seoDescription:  f.seoDescription,
      slug:            f.slug || this.computedSlug(),
    };
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async saveDraft(): Promise<void> {
    this.isSubmitting.set(true);
    await this.submitPayload(this.buildPayload('draft'));
  }

  async saveChanges(): Promise<void> {
    if (!this.validateForm()) {
      document.querySelector('.field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.isSubmitting.set(true);
    await this.submitPayload(this.buildPayload(this.form().status));
  }

  private async submitPayload(payload: ProductFormPayload): Promise<void> {
    // Replace with:
    // this.http.put(`/api/admin/products/${this.productId()}`, payload, { headers: authHeaders })
    await new Promise(r => setTimeout(r, 1200));
    this.isSubmitting.set(false);
    this.submitStatus.set('success');
    setTimeout(() => this.router.navigate(['/admin/products']), 1200);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasError(field: string): boolean { return !!this.errors()[field]; }
  errorMsg(field: string): string  { return this.errors()[field] ?? ''; }
  formatBytes(b: number): string   { return this.pfs.formatBytes(b); }
  trackById(_: number, item: { id: string }): string { return item.id; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeLightbox(); }

  ngOnDestroy(): void {}
}