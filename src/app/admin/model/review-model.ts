export type ReviewStatus = 'new' | 'read' | 'approved' | 'featured' | 'flagged';

export interface AdminReview {
  id: string;

  customerName: string;
  customerEmail: string;

  productId: string;
  productName: string;
  productImage: string;

  rating: number;

  title: string;
  review: string;

  status: ReviewStatus;

  verifiedPurchase: boolean;
  helpfulVotes: number;
  reported: boolean;

  createdAt: string; // ISO date
}