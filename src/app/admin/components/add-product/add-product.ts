// add-product.component.ts
import {
  Component, signal, computed, inject, HostListener, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ProductImage, ColorVariant, ProductFormPayload,
  ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_SLOT,
} from '../../model/product-image.model';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';

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
}

@Component({
  selector: 'app-add-product',
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss',
})
export class AddProduct implements OnDestroy {
  private router = inject(Router);
  protected lang = inject(LanguageService);

  form = signal<ProductForm>({
    name: '', brand: '', category: '', description: '', specifications: '',
    tagsRaw: '', price: null, originalPrice: null, discount: null,
    stock: null, sku: '', barcode: '', weight: null,
    dimLength: null, dimWidth: null, dimHeight: null, warranty: '',
    featured: false, isNew: false, badge: null,
    seoTitle: '', seoDescription: '', slug: '',
  });

  hasColorVariants = signal(false);
  defaultImages    = signal<ProductImage[]>([]);
  colorVariants    = signal<ColorVariant[]>([]);

  isSubmitting  = signal(false);
  submitStatus  = signal<'idle' | 'success' | 'error'>('idle');
  errors        = signal<Record<string, string>>({});
  activeSection = signal('basic');
  dragOverSlot  = signal<string | null>(null);

  categories = [
    'Electronics', 'Smartphones', 'Laptops', 'Audio',
    'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion',
  ];

  warrantyOptions = ['No warranty', '6 months', '1 year', '2 years', '3 years', '5 years'];

  computedDiscount = computed(() => {
    const f = this.form();
    if (f.price && f.originalPrice && f.originalPrice > f.price) {
      return Math.round(((f.originalPrice - f.price) / f.originalPrice) * 100);
    }
    return 0;
  });

  computedSlug = computed(() =>
    this.form().name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  );

  totalImages = computed(() => {
    if (this.hasColorVariants()) {
      return this.colorVariants().reduce((sum, v) => sum + v.images.length, 0);
    }
    return this.defaultImages().length;
  });

  patchForm(patch: Partial<ProductForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
    if (patch.name !== undefined && !this.form().slug) {
      this.form.update(f => ({ ...f, slug: this.computedSlug() }));
    }
    if (patch) {
      const keys = Object.keys(patch) as (keyof ProductForm)[];
      this.errors.update(e => {
        const next = { ...e };
        keys.forEach(k => delete next[k]);
        return next;
      });
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  private validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return this.lang.translate('addProduct.errors.imageFormatInvalid', { name: file.name });
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return this.lang.translate('addProduct.errors.imageSizeExceeded', { name: file.name });
    }
    return null;
  }

  private buildProductImage(file: File, base64: string): ProductImage {
    return {
      id: crypto.randomUUID(),
      file,
      base64,
      preview: base64,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
  }

  async onDefaultImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.addDefaultImages(files);
  }

  async onDefaultImageSelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    await this.addDefaultImages(files);
    (event.target as HTMLInputElement).value = '';
  }

  private async addDefaultImages(files: File[]): Promise<void> {
    const current = this.defaultImages();
    const remaining = MAX_IMAGES_PER_SLOT - current.length;
    const toProcess = files.slice(0, remaining);
    const imageErrors: string[] = [];

    for (const file of toProcess) {
      const err = this.validateImageFile(file);
      if (err) { imageErrors.push(err); continue; }
      const base64 = await this.fileToBase64(file);
      this.defaultImages.update(list => [...list, this.buildProductImage(file, base64)]);
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

  addColorVariant(): void {
    const newVariant: ColorVariant = {
      id: crypto.randomUUID(),
      colorName: '',
      colorHex: '#000000',
      images: [],
    };
    this.colorVariants.update(list => [...list, newVariant]);
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
    const toProcess = files.slice(0, remaining);
    const imageErrors: string[] = [];

    for (const file of toProcess) {
      const err = this.validateImageFile(file);
      if (err) { imageErrors.push(err); continue; }
      const base64 = await this.fileToBase64(file);
      const img = this.buildProductImage(file, base64);
      this.colorVariants.update(list =>
        list.map(v => v.id === variantId
          ? { ...v, images: [...v.images, img] }
          : v
        )
      );
    }

    if (imageErrors.length) {
      this.errors.update(e => ({ ...e, [`variant_${variantId}_images`]: imageErrors.join(' ') }));
    }
  }

  removeVariantImage(variantId: string, imageId: string): void {
    this.colorVariants.update(list =>
      list.map(v => v.id === variantId
        ? { ...v, images: v.images.filter(img => img.id !== imageId) }
        : v
      )
    );
  }

  onDragOver(event: DragEvent, slotId: string): void {
    event.preventDefault();
    this.dragOverSlot.set(slotId);
  }

  onDragLeave(): void { this.dragOverSlot.set(null); }

  toggleColorVariants(): void {
    this.hasColorVariants.update(v => !v);
    if (this.hasColorVariants() && this.colorVariants().length === 0) {
      this.addColorVariant();
    }
  }

  private validate(): boolean {
    const f    = this.form();
    const errs: Record<string, string> = {};

    if (!f.name.trim())        errs['name']     = this.lang.translate('addProduct.errors.nameRequired');
    if (!f.brand.trim())       errs['brand']    = this.lang.translate('addProduct.errors.brandRequired');
    if (!f.category)           errs['category'] = this.lang.translate('addProduct.errors.categoryRequired');
    if (!f.price || f.price <= 0)
                               errs['price']    = this.lang.translate('addProduct.errors.priceInvalid');
    if (f.stock === null || f.stock < 0)
                               errs['stock']    = this.lang.translate('addProduct.errors.stockRequired');
    if (!f.sku.trim())         errs['sku']      = this.lang.translate('addProduct.errors.skuRequired');
    if (!f.description.trim()) errs['description'] = this.lang.translate('categories.validation.descriptionRequired');

    if (f.discount !== null && (f.discount < 0 || f.discount > 100)) {
      errs['discount'] = this.lang.translate('addProduct.errors.discountRange');
    }

    if (!this.hasColorVariants()) {
      if (this.defaultImages().length === 0) {
        errs['images'] = this.lang.translate('addProduct.errors.imagesRequired');
      }
    } else {
      if (this.colorVariants().length === 0) {
        errs['colorVariants'] = this.lang.translate('addProduct.errors.colorVariantsRequired');
      }
      const emptyNames = this.colorVariants().filter(v => !v.colorName.trim());
      if (emptyNames.length) errs['colorVariants'] = this.lang.translate('addProduct.errors.colorVariantsNameRequired');

      const emptyImages = this.colorVariants().filter(v => v.images.length === 0);
      if (emptyImages.length) errs['colorVariants'] = this.lang.translate('addProduct.errors.colorVariantsImagesRequired');

      const names = this.colorVariants().map(v => v.colorName.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        errs['colorVariants'] = this.lang.translate('addProduct.errors.colorVariantsNameUnique');
      }
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

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
      dimensions: {
        length: f.dimLength ?? 0,
        width:  f.dimWidth  ?? 0,
        height: f.dimHeight ?? 0,
      },
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

  async saveDraft(): Promise<void> {
    this.isSubmitting.set(true);
    const payload = this.buildPayload('draft');
    await this.submit(payload);
  }

  async publish(): Promise<void> {
    if (!this.validate()) {
      this.scrollToFirstError();
      return;
    }
    this.isSubmitting.set(true);
    const payload = this.buildPayload('active');
    await this.submit(payload);
  }

  private async submit(payload: ProductFormPayload): Promise<void> {
    // Replace with:
    // this.http.post('/api/admin/products', payload, { headers: authHeaders })
    await new Promise(r => setTimeout(r, 1400));
    this.isSubmitting.set(false);
    this.submitStatus.set('success');
    setTimeout(() => this.router.navigate(['/admin/products']), 1200);
  }

  private scrollToFirstError(): void {
    const first = document.querySelector('.field-error');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hasError(field: string): boolean { return !!this.errors()[field]; }
  errorMsg(field: string): string  { return this.errors()[field] ?? ''; }

  trackById(_: number, item: { id: string }): string { return item.id; }
  trackByIndex(i: number): number { return i; }

  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(0) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { /* could close modals if added later */ }

  ngOnDestroy(): void { /* cleanup if needed */ }
}