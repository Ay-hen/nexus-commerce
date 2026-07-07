import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReview } from '../../model/review-model';
import { AdminReviewDetail } from '../../model/review-detail-model';

@Component({
  selector: 'app-view-review-modal',
  imports: [CommonModule],
  templateUrl: './view-review-modal.html',
  styleUrl: './view-review-modal.scss',
})
export class ViewReviewModal {
  @Input({ required: true }) review!: AdminReviewDetail;

  /** Emitted once the closing animation has finished — parent should remove the component. */
  @Output() closed = new EventEmitter<void>();
  /** Emitted when the admin chooses to delete this review from the modal. */
  @Output() deleteRequested = new EventEmitter<AdminReview>();

  closing = signal(false);

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
    this.requestClose();
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  /** Stops the click from bubbling to the backdrop (which would close the modal). */
  stop(event: Event): void {
    event.stopPropagation();
  }

  requestClose(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 200);
  }

  requestDelete(): void {
    this.deleteRequested.emit(this.review);
  }

  // ── Helpers (mirrors Reviews component's own helpers) ────────────────────
  starsFor(rating: number): { filled: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({ filled: i < Math.round(rating) }));
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'New', read: 'Read', approved: 'Approved', featured: 'Featured', flagged: 'Flagged',
    };
    return map[status] ?? status;
  }

  initialsFor(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  trackByHistoryId(_: number, item: { id: string }): string {
    return item.id;
  }
}