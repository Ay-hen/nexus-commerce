import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminCategoryDetail, CategoryProduct } from '../../model/category-detail.model';
import { LanguageService } from '../../../localization/language.service';
import { TranslatePipe } from '../../../localization/translate.pipe';

@Component({
  selector: 'app-view-category-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './view-category-modal.html',
  styleUrl: './view-category-modal.scss',
})
export class ViewCategoryModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) category!: AdminCategoryDetail;

  lang = inject(LanguageService);

  /** Emitted once the closing animation has finished — parent should remove the component. */
  @Output() closed = new EventEmitter<void>();
  /** Emitted when the user clicks "Edit Category" from the footer. */
  @Output() editRequested = new EventEmitter<AdminCategoryDetail>();

  closing = signal(false);
  zoomedImage = signal<string | null>(null);

  private previousOverflow = '';

  ngOnInit(): void {
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.zoomedImage()) {
      this.zoomedImage.set(null);
      return;
    }
    this.requestClose();
  }

  requestClose(): void {
    if (this.closing()) return;
    this.closing.set(true);
    // Keep in sync with the .vcm-modal--closing / .vcm-backdrop--closing animation duration.
    setTimeout(() => this.closed.emit(), 200);
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  /** Stops the click from bubbling to the backdrop (which would close the modal). */
  stop(event: Event): void {
    event.stopPropagation();
  }

  openZoom(src: string, event: Event): void {
    event.stopPropagation();
    this.zoomedImage.set(src);
  }

  closeZoom(): void {
    this.zoomedImage.set(null);
  }

  onEdit(): void {
    this.editRequested.emit(this.category);
  }

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatPrice(value: number): string {
    return this.lang.formatCurrency(value, 'MAD');
  }

  // Maps stock status to existing inventory.status.* translation keys
  // (exact same English text already lived there: "In Stock" / "Low Stock" /
  // "Out of Stock"), instead of hardcoding literal strings.
  stockLabel(p: CategoryProduct): string {
    const map: Record<CategoryProduct['status'], string> = {
      'in-stock': 'inventory.status.inStock',
      'low-stock': 'inventory.status.lowStock',
      'out-of-stock': 'inventory.status.outOfStock',
    };
    return this.lang.translate(map[p.status]);
  }

  trackByProduct(_: number, p: CategoryProduct): string {
    return p.id;
  }

  trackByImage(_: number, img: string): string {
    return img;
  }
}