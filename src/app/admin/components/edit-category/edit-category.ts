import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminCategoryDetail } from '../../model/category-detail.model';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = ['admin', 'new', 'checkout', 'cart', 'edit'];

@Component({
  selector: 'app-edit-category-modal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './edit-category.html',
  styleUrl: './edit-category.scss',
})
export class EditCategoryModal implements OnInit, OnDestroy {
  @Input({ required: true }) category!: AdminCategoryDetail;

  /** Emitted once the closing animation has finished — parent should remove the component. */
  @Output() closed = new EventEmitter<void>();
  /** Emitted with the updated category once a save has completed successfully. */
  @Output() saved = new EventEmitter<AdminCategoryDetail>();

  private fb = new FormBuilder();

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    slug: ['', [Validators.required, Validators.pattern(SLUG_PATTERN)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    status: ['active' as 'active' | 'inactive'],
    featured: [false],
    seoTitle: ['', [Validators.maxLength(60)]],
    seoDescription: ['', [Validators.maxLength(160)]],
  });

  // ── Non-form state (chips / images) ─────────────────────────────────────
  keywords = signal<string[]>([]);
  keywordDraft = signal('');
  coverImage = signal<string>('');
  gallery = signal<string[]>([]);

  // ── UI state ───────────────────────────────────────────────────────────
  closing = signal(false);
  saveState = signal<SaveState>('idle');
  errorMessage = signal('');
  confirmingDiscard = signal(false);
  coverDragOver = signal(false);
  galleryDragOver = signal(false);
  slugTouchedManually = signal(false);

  private snapshot = '';
  private previousOverflow = '';

  ngOnInit(): void {
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this.form.patchValue({
      name: this.category.name,
      slug: this.category.slug,
      description: this.category.description,
      status: this.category.status,
      featured: this.category.featured,
      seoTitle: this.category.seo.metaTitle,
      seoDescription: this.category.seo.metaDescription,
    });
    this.keywords.set([...this.category.seo.keywords]);
    this.coverImage.set(this.category.coverImage);
    this.gallery.set([...this.category.gallery]);

    this.snapshot = this.currentSnapshot();

    // Auto-generate the slug from the name until the user edits slug directly.
    this.form.controls.name.valueChanges.subscribe(name => {
      if (!this.slugTouchedManually()) {
        this.form.controls.slug.setValue(this.slugify(name), { emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
  }

  get f() {
    return this.form.controls;
  }

  // ── Dirty tracking ────────────────────────────────────────────────────
  private currentSnapshot(): string {
    return JSON.stringify({
      form: this.form.getRawValue(),
      keywords: this.keywords(),
      coverImage: this.coverImage(),
      gallery: this.gallery(),
    });
  }

  isDirty(): boolean {
    return this.currentSnapshot() !== this.snapshot;
  }

  // ── Close / discard flow ──────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.onSubmit();
      return;
    }
    if (event.key === 'Escape') {
      if (this.confirmingDiscard()) {
        this.confirmingDiscard.set(false);
        return;
      }
      this.requestClose();
    }
  }

  requestClose(): void {
    if (this.saveState() === 'saving' || this.closing()) return;
    if (this.isDirty()) {
      this.confirmingDiscard.set(true);
      return;
    }
    this.doClose();
  }

  keepEditing(): void {
    this.confirmingDiscard.set(false);
  }

  discardAndClose(): void {
    this.confirmingDiscard.set(false);
    this.doClose();
  }

  private doClose(): void {
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 200);
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  /** Stops the click from bubbling to the backdrop (which would close the modal). */
  stop(event: Event): void {
    event.stopPropagation();
  }

  // ── Slug helpers ──────────────────────────────────────────────────────
  onSlugManualEdit(): void {
    this.slugTouchedManually.set(true);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ── Keyword chips ─────────────────────────────────────────────────────
  addKeywordFromDraft(event: Event): void {
    event.preventDefault();
    const raw = this.keywordDraft().trim().replace(/,+$/, '');
    if (!raw) return;
    if (!this.keywords().includes(raw)) {
      this.keywords.update(list => [...list, raw]);
    }
    this.keywordDraft.set('');
  }

  onKeywordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      this.addKeywordFromDraft(event);
    } else if (event.key === 'Backspace' && !this.keywordDraft() && this.keywords().length) {
      this.keywords.update(list => list.slice(0, -1));
    }
  }

  removeKeyword(kw: string): void {
    this.keywords.update(list => list.filter(k => k !== kw));
  }

  // ── Cover image upload ────────────────────────────────────────────────
  onCoverDragOver(event: DragEvent): void {
    event.preventDefault();
    this.coverDragOver.set(true);
  }

  onCoverDragLeave(): void {
    this.coverDragOver.set(false);
  }

  onCoverDrop(event: DragEvent): void {
    event.preventDefault();
    this.coverDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readImage(file, url => this.coverImage.set(url));
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.readImage(file, url => this.coverImage.set(url));
    input.value = '';
  }

  removeCover(): void {
    this.coverImage.set('');
  }

  // ── Gallery upload ────────────────────────────────────────────────────
  onGalleryDragOver(event: DragEvent): void {
    event.preventDefault();
    this.galleryDragOver.set(true);
  }

  onGalleryDragLeave(): void {
    this.galleryDragOver.set(false);
  }

  onGalleryDrop(event: DragEvent): void {
    event.preventDefault();
    this.galleryDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    files.forEach(file => this.readImage(file, url => this.gallery.update(list => [...list, url])));
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    files.forEach(file => this.readImage(file, url => this.gallery.update(list => [...list, url])));
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    this.gallery.update(list => list.filter((_, i) => i !== index));
  }

  private readImage(file: File, cb: (url: string) => void): void {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── Reset ─────────────────────────────────────────────────────────────
  resetForm(): void {
    this.form.patchValue({
      name: this.category.name,
      slug: this.category.slug,
      description: this.category.description,
      status: this.category.status,
      featured: this.category.featured,
      seoTitle: this.category.seo.metaTitle,
      seoDescription: this.category.seo.metaDescription,
    });
    this.keywords.set([...this.category.seo.keywords]);
    this.coverImage.set(this.category.coverImage);
    this.gallery.set([...this.category.gallery]);
    this.slugTouchedManually.set(false);
    this.errorMessage.set('');
    this.saveState.set('idle');
  }

  // ── Save ──────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.saveState() === 'saving') return;
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.coverImage()) {
      this.saveState.set('error');
      this.errorMessage.set('Please fix the highlighted fields before saving.');
      setTimeout(() => { if (this.saveState() === 'error') this.saveState.set('idle'); }, 1800);
      return;
    }

    const slug = this.form.controls.slug.value;
    if (RESERVED_SLUGS.includes(slug)) {
      this.saveState.set('error');
      this.errorMessage.set(`The slug "/${slug}" is reserved. Please choose another.`);
      setTimeout(() => { if (this.saveState() === 'error') this.saveState.set('idle'); }, 1800);
      return;
    }

    this.saveState.set('saving');
    this.errorMessage.set('');

    // Replace with: this.categoryService.update(this.category.id, payload)
    setTimeout(() => {
      const raw = this.form.getRawValue();
      const updated: AdminCategoryDetail = {
        ...this.category,
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        status: raw.status,
        featured: raw.featured,
        image: this.coverImage(),
        coverImage: this.coverImage(),
        gallery: this.gallery(),
        updatedAt: new Date().toISOString().slice(0, 10),
        seo: {
          metaTitle: raw.seoTitle,
          metaDescription: raw.seoDescription,
          keywords: this.keywords(),
        },
      };

      this.saveState.set('success');
      this.snapshot = this.currentSnapshot();

      setTimeout(() => {
        this.saved.emit(updated);
        this.doClose();
      }, 700);
    }, 900);
  }
}