import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminReview } from '../../model/review-model';
import { AdminReviewDetail, ModerationActionKind } from '../../model/review-detail-model';
import { TranslatePipe } from '../../localization/translate.pipe';
import { LanguageService } from '../../localization/language.service';

const MODERATION_KIND_KEY_MAP: Record<ModerationActionKind, string> = {
  submitted: 'submitted', reported: 'reported', markedRead: 'markedRead',
  approved: 'approved', featured: 'featured', flagged: 'flagged',
};

@Component({
  selector: 'app-view-review-modal',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './view-review-modal.html',
  styleUrl: './view-review-modal.scss',
})
export class ViewReviewModal {
  protected lang = inject(LanguageService);

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
    return this.lang.translate('reviews.status.' + status);
  }

  moderationLabel(kind: ModerationActionKind): string {
    return this.lang.translate('viewReviewModal.moderationActions.' + MODERATION_KIND_KEY_MAP[kind]);
  }

  initialsFor(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDateTime(iso: string): string {
    return this.lang.formatDateTime(iso);
  }

  trackByHistoryId(_: number, item: { id: string }): string {
    return item.id;
  }
}