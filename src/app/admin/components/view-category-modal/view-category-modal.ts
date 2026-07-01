import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminCategoryDetail, CategoryProduct } from '../../model/category-detail.model';

@Component({
  selector: 'app-view-category-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-category-modal.html',
  styleUrl: './view-category-modal.scss',
})
export class ViewCategoryModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) category!: AdminCategoryDetail;

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
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  stockLabel(p: CategoryProduct): string {
    if (p.status === 'in-stock') return 'In Stock';
    if (p.status === 'low-stock') return 'Low Stock';
    return 'Out of Stock';
  }

  trackByProduct(_: number, p: CategoryProduct): string {
    return p.id;
  }

  trackByImage(_: number, img: string): string {
    return img;
  }
}