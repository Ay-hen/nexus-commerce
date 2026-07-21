// add-category.ts
import {
  Component, signal, computed, inject, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// ─── Local types ────────────────────────────────────────────────────────────
export interface CategoryImage {
  id: string;
  file: File;
  base64: string;
  preview: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface CategoryFormPayload {
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  featured: boolean;
  thumbnail: CategoryImage | null;
  cover: CategoryImage | null;
  gallery: CategoryImage[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  publishStatus: 'active' | 'draft';
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  keywordDraft: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 6;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

@Component({
  selector: 'app-add-category',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss',
})
export class AddCategory {
  private router = inject(Router);

  // ── Form state ────────────────────────────────────────────────────────────
  form = signal<CategoryForm>({
    name: '', slug: '', description: '', status: 'active', featured: false,
    metaTitle: '', metaDescription: '', keywords: [], keywordDraft: '',
  });

  slugTouched = signal(false);

  // ── Image state ───────────────────────────────────────────────────────────
  thumbnail = signal<CategoryImage | null>(null);
  cover     = signal<CategoryImage | null>(null);
  gallery   = signal<CategoryImage[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  isSubmitting = signal(false);
  submitStatus = signal<'idle' | 'success' | 'error'>('idle');
  errors       = signal<Record<string, string>>({});
  dragOverSlot = signal<string | null>(null); // 'thumbnail' | 'cover' | 'gallery'

  // ── Meta timestamps (for sidebar) ────────────────────────────────────────
  createdAt = signal(new Date());
  updatedAt = signal(new Date());

  readonly maxGalleryImages = MAX_GALLERY_IMAGES;

  // ── Computed ──────────────────────────────────────────────────────────────
  computedSlug = computed(() => slugify(this.form().name));
  effectiveSlug = computed(() => this.form().slug || this.computedSlug());

  totalImages = computed(() =>
    (this.thumbnail() ? 1 : 0) + (this.cover() ? 1 : 0) + this.gallery().length
  );

  seoScore = computed(() => {
    const f = this.form();
    let score = 0;
    if (f.name.trim().length > 3) score += 15;
    if (f.description.trim().length > 40) score += 20;
    if (f.metaTitle.trim().length > 0) score += 15;
    if (f.metaDescription.trim().length > 40) score += 20;
    if (f.keywords.length >= 3) score += 15;
    if (this.thumbnail()) score += 15;
    return Math.min(score, 100);
  });

  seoScoreLabel = computed(() => {
    const s = this.seoScore();
    if (s >= 80) return 'Excellent';
    if (s >= 50) return 'Good';
    return 'Needs work';
  });

  // ── Form field helpers ────────────────────────────────────────────────────
  patchForm(patch: Partial<CategoryForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
    if (patch.name !== undefined && !this.slugTouched()) {
      this.form.update(f => ({ ...f, slug: this.computedSlug() }));
    }
    const keys = Object.keys(patch) as (keyof CategoryForm)[];
    this.errors.update(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }

  onSlugInput(value: string): void {
    this.slugTouched.set(true);
    this.patchForm({ slug: slugify(value) });
  }

  // ── SEO keyword chips ─────────────────────────────────────────────────────
  addKeyword(): void {
    const draft = this.form().keywordDraft.trim();
    if (!draft) return;
    const exists = this.form().keywords.some(k => k.toLowerCase() === draft.toLowerCase());
    if (exists) { this.patchForm({ keywordDraft: '' }); return; }
    this.form.update(f => ({ ...f, keywords: [...f.keywords, draft], keywordDraft: '' }));
  }

  onKeywordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addKeyword();
    }
  }

  removeKeyword(keyword: string): void {
    this.form.update(f => ({ ...f, keywords: f.keywords.filter(k => k !== keyword) }));
  }

  // ── Image helpers — Base64 conversion ─────────────────────────────────────
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
      return `"${file.name}" is not a supported format (JPEG, PNG, WebP only).`;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `"${file.name}" exceeds 5 MB limit.`;
    }
    return null;
  }

  private buildCategoryImage(file: File, base64: string): CategoryImage {
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

  // ── Thumbnail (single) ────────────────────────────────────────────────────
  async onThumbnailSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    await this.setThumbnail(file);
  }

  async onThumbnailDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.setThumbnail(file);
  }

  private async setThumbnail(file: File): Promise<void> {
    const err = this.validateImageFile(file);
    if (err) { this.errors.update(e => ({ ...e, thumbnail: err })); return; }
    const base64 = await this.fileToBase64(file);
    this.thumbnail.set(this.buildCategoryImage(file, base64));
    this.errors.update(e => { const n = { ...e }; delete n['thumbnail']; return n; });
  }

  removeThumbnail(): void { this.thumbnail.set(null); }

  // ── Cover (single) ────────────────────────────────────────────────────────
  async onCoverSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    await this.setCover(file);
  }

  async onCoverDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await this.setCover(file);
  }

  private async setCover(file: File): Promise<void> {
    const err = this.validateImageFile(file);
    if (err) { this.errors.update(e => ({ ...e, cover: err })); return; }
    const base64 = await this.fileToBase64(file);
    this.cover.set(this.buildCategoryImage(file, base64));
    this.errors.update(e => { const n = { ...e }; delete n['cover']; return n; });
  }

  removeCover(): void { this.cover.set(null); }

  // ── Gallery (multiple) ────────────────────────────────────────────────────
  async onGallerySelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = '';
    await this.addGalleryImages(files);
  }

  async onGalleryDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverSlot.set(null);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.addGalleryImages(files);
  }

  private async addGalleryImages(files: File[]): Promise<void> {
    const remaining = MAX_GALLERY_IMAGES - this.gallery().length;
    const toProcess = files.slice(0, remaining);
    const imageErrors: string[] = [];

    for (const file of toProcess) {
      const err = this.validateImageFile(file);
      if (err) { imageErrors.push(err); continue; }
      const base64 = await this.fileToBase64(file);
      this.gallery.update(list => [...list, this.buildCategoryImage(file, base64)]);
    }

    if (imageErrors.length) {
      this.errors.update(e => ({ ...e, gallery: imageErrors.join(' ') }));
    } else {
      this.errors.update(e => { const n = { ...e }; delete n['gallery']; return n; });
    }
  }

  removeGalleryImage(id: string): void {
    this.gallery.update(list => list.filter(img => img.id !== id));
  }

  // ── Drag events ───────────────────────────────────────────────────────────
  onDragOver(event: DragEvent, slotId: string): void {
    event.preventDefault();
    this.dragOverSlot.set(slotId);
  }

  onDragLeave(): void { this.dragOverSlot.set(null); }

  // ── Validation ────────────────────────────────────────────────────────────
  private validate(): boolean {
    const f = this.form();
    const errs: Record<string, string> = {};

    if (!f.name.trim()) errs['name'] = 'Category name is required.';
    if (!f.description.trim()) errs['description'] = 'Description is required.';
    if (!this.effectiveSlug().trim()) errs['slug'] = 'URL slug is required.';
    if (!this.thumbnail()) errs['thumbnail'] = 'A thumbnail image is required.';

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Build payload ─────────────────────────────────────────────────────────
  private buildPayload(publishStatus: 'active' | 'draft'): CategoryFormPayload {
    const f = this.form();
    return {
      name: f.name.trim(),
      slug: this.effectiveSlug(),
      description: f.description.trim(),
      status: f.status,
      featured: f.featured,
      thumbnail: this.thumbnail(),
      cover: this.cover(),
      gallery: this.gallery(),
      metaTitle: f.metaTitle || f.name,
      metaDescription: f.metaDescription,
      keywords: f.keywords,
      publishStatus,
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async saveDraft(): Promise<void> {
    this.isSubmitting.set(true);
    const payload = this.buildPayload('draft');
    await this.submit(payload);
  }

  async create(): Promise<void> {
    if (!this.validate()) {
      this.scrollToFirstError();
      return;
    }
    this.isSubmitting.set(true);
    const payload = this.buildPayload('active');
    await this.submit(payload);
  }

  cancel(): void {
    this.router.navigate(['/admin/categories']);
  }

  private async submit(payload: CategoryFormPayload): Promise<void> {
    // Replace with:
    // this.http.post('/api/admin/categories', payload, { headers: authHeaders })
    await new Promise(r => setTimeout(r, 1300));
    this.isSubmitting.set(false);
    this.submitStatus.set('success');
    setTimeout(() => this.router.navigate(['/admin/categories']), 1100);
  }

  private scrollToFirstError(): void {
    const first = document.querySelector('.field--error, .upload-slot--error');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  hasError(field: string): boolean { return !!this.errors()[field]; }
  errorMsg(field: string): string { return this.errors()[field] ?? ''; }

  trackById(_: number, item: { id: string }): string { return item.id; }

  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(0) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { /* reserved for future modal use */ }
}