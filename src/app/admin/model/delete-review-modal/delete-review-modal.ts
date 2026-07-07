import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReview } from '../../model/review-model';

@Component({
  selector: 'app-delete-review-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-review-modal.html',
  styleUrl: './delete-review-modal.scss',
})
export class DeleteReviewModal {
  /** Single-review delete. Null when this is a bulk delete instead. */
  @Input() review: AdminReview | null = null;
  /** Bulk delete count. Null when this is a single-review delete instead. */
  @Input() bulkCount: number | null = null;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  closing = signal(false);

  isBulk = computed(() => this.review === null && this.bulkCount !== null);

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
    this.requestCancel();
  }

  onBackdropClick(): void {
    this.requestCancel();
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  requestCancel(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.cancelled.emit(), 180);
  }

  confirmDelete(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.confirmed.emit(), 180);
  }
}