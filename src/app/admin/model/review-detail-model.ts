import { AdminReview } from './review-model';

export interface ModerationHistoryEntry {
  id: string;
  action: string;
  actor: string;
  date: string;
  note?: string;
}

export interface AdminReviewDetail extends AdminReview {
  moderationHistory: ModerationHistoryEntry[];
}

/**
 * Builds a plausible moderation trail for the View Review modal.
 * This is mock data — swap for a real `ReviewService.getHistory(id)` call
 * once the backend is wired up. The modal only depends on the
 * `AdminReviewDetail` shape, not where it came from.
 */
export function toReviewDetail(review: AdminReview): AdminReviewDetail {
  return {
    ...review,
    moderationHistory: buildMockHistory(review),
  };
}

function offsetDate(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600000).toISOString();
}

function buildMockHistory(review: AdminReview): ModerationHistoryEntry[] {
  const history: ModerationHistoryEntry[] = [
    {
      id: 'h-submitted',
      action: 'Review submitted',
      actor: review.customerName,
      date: review.createdAt,
    },
  ];

  if (review.reported) {
    history.push({
      id: 'h-reported',
      action: 'Reported by another customer',
      actor: 'System',
      date: offsetDate(review.createdAt, 3),
      note: 'Flagged for containing potentially inappropriate content.',
    });
  }

  if (review.status !== 'new') {
    history.push({
      id: 'h-read',
      action: 'Marked as read',
      actor: 'Admin',
      date: offsetDate(review.createdAt, 6),
    });
  }

  if (review.status === 'approved' || review.status === 'featured') {
    history.push({
      id: 'h-approved',
      action: 'Approved for storefront',
      actor: 'Admin',
      date: offsetDate(review.createdAt, 20),
    });
  }

  if (review.status === 'featured') {
    history.push({
      id: 'h-featured',
      action: 'Featured on product page',
      actor: 'Admin',
      date: offsetDate(review.createdAt, 30),
    });
  }

  if (review.status === 'flagged') {
    history.push({
      id: 'h-flagged',
      action: 'Flagged for moderation',
      actor: 'Admin',
      date: offsetDate(review.createdAt, 12),
      note: 'Requires further review before publishing.',
    });
  }

  return history;
}