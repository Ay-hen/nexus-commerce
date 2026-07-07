import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminReview, ReviewStatus } from '../../model/review-model';
import { AdminReviewDetail, toReviewDetail } from '../../model/review-detail-model';
import { ViewReviewModal } from '../../model/view-review-modal/view-review-modal';
import { DeleteReviewModal } from '../../model/delete-review-modal/delete-review-modal';

export type SearchField = 'all' | 'customer' | 'email' | 'product' | 'title' | 'review';
export type RatingFilter = 'all' | 5 | 4 | 3 | 2 | 1;
export type BoolFilter = 'all' | 'yes' | 'no';
export type SortKey = 'newest' | 'oldest' | 'ratingHigh' | 'ratingLow' | 'customer' | 'product' | 'helpful';
export type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewReviewModal, DeleteReviewModal],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews {

  // ── Loading ──────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5];

  // ── Toast ────────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Data ─────────────────────────────────────────────────────────────────
  private allReviews = signal<AdminReview[]>(this.generateMockReviews());

  // ── Search / filters / sort ──────────────────────────────────────────────
  searchQuery = signal('');
  searchField = signal<SearchField>('all');

  statusFilter = signal<'all' | ReviewStatus>('all');
  ratingFilter = signal<RatingFilter>('all');
  verifiedFilter = signal<BoolFilter>('all');
  reportedFilter = signal<BoolFilter>('all');

  sortKey = signal<SortKey>('newest');

  viewMode = signal<ViewMode>('table');

  filtersOpen = signal(false);

  searchFieldOptions: { key: SearchField; label: string }[] = [
    { key: 'all', label: 'All Fields' },
    { key: 'customer', label: 'Customer' },
    { key: 'email', label: 'Email' },
    { key: 'product', label: 'Product' },
    { key: 'title', label: 'Title' },
    { key: 'review', label: 'Review' },
  ];

  statusOptions: { key: 'all' | ReviewStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'read', label: 'Read' },
    { key: 'approved', label: 'Approved' },
    { key: 'featured', label: 'Featured' },
    { key: 'flagged', label: 'Flagged' },
  ];

  ratingOptions: { key: RatingFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 5, label: '5★' },
    { key: 4, label: '4★' },
    { key: 3, label: '3★' },
    { key: 2, label: '2★' },
    { key: 1, label: '1★' },
  ];

  sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'ratingHigh', label: 'Highest Rating' },
    { key: 'ratingLow', label: 'Lowest Rating' },
    { key: 'customer', label: 'Customer' },
    { key: 'product', label: 'Product' },
    { key: 'helpful', label: 'Most Helpful' },
  ];

  // ── Pagination ───────────────────────────────────────────────────────────
  pageSize = signal(10);
  currentPage = signal(1);
  pageSizeOptions = [5, 10, 20];

  // ── Row menu ─────────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Selection ────────────────────────────────────────────────────────────
  selectedIds = signal<Set<string>>(new Set());

  // ── Modals ───────────────────────────────────────────────────────────────
  viewingReview = signal<AdminReviewDetail | null>(null);
  deletingReview = signal<AdminReview | null>(null);
  bulkDeleteCount = signal<number | null>(null);

  // ══════════════════════════════════════════════════════════════════════
  // Computed pipeline: filter → sort → paginate
  // ══════════════════════════════════════════════════════════════════════

  filteredReviews = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const field = this.searchField();
    const status = this.statusFilter();
    const rating = this.ratingFilter();
    const verified = this.verifiedFilter();
    const reported = this.reportedFilter();

    return this.allReviews().filter(r => {
      if (status !== 'all' && r.status !== status) return false;
      if (rating !== 'all' && r.rating !== rating) return false;
      if (verified !== 'all' && r.verifiedPurchase !== (verified === 'yes')) return false;
      if (reported !== 'all' && r.reported !== (reported === 'yes')) return false;

      if (q) {
        const haystacks: Record<SearchField, string> = {
          all: `${r.customerName} ${r.customerEmail} ${r.productName} ${r.title} ${r.review}`,
          customer: r.customerName,
          email: r.customerEmail,
          product: r.productName,
          title: r.title,
          review: r.review,
        };
        if (!haystacks[field].toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  sortedReviews = computed(() => {
    const key = this.sortKey();
    const list = [...this.filteredReviews()];

    list.sort((a, b) => {
      switch (key) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'ratingHigh': return b.rating - a.rating;
        case 'ratingLow': return a.rating - b.rating;
        case 'customer': return a.customerName.localeCompare(b.customerName);
        case 'product': return a.productName.localeCompare(b.productName);
        case 'helpful': return b.helpfulVotes - a.helpfulVotes;
        default: return 0;
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedReviews().length / this.pageSize())));

  pagedReviews = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedReviews().slice(start, start + this.pageSize());
  });

  pageRangeLabel = computed(() => {
    const total = this.sortedReviews().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start}–${end} of ${total}`;
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const span = 1;
    const range: number[] = [];
    for (let i = Math.max(1, current - span); i <= Math.min(total, current + span); i++) range.push(i);
    return range;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  totalReviews = computed(() => this.allReviews().length);

  averageRating = computed(() => {
    const list = this.allReviews();
    if (!list.length) return 0;
    return Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10;
  });

  pendingModerationCount = computed(() => this.allReviews().filter(r => r.status === 'new').length);
  featuredCount = computed(() => this.allReviews().filter(r => r.status === 'featured').length);

  // ── Selection helpers ────────────────────────────────────────────────────
  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  toggleSelect(id: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  allOnPageSelected = computed(() => {
    const page = this.pagedReviews();
    return page.length > 0 && page.every(r => this.selectedIds().has(r.id));
  });

  someOnPageSelected = computed(() => {
    const page = this.pagedReviews();
    return page.some(r => this.selectedIds().has(r.id)) && !this.allOnPageSelected();
  });

  toggleSelectAllOnPage(): void {
    const page = this.pagedReviews();
    const shouldSelect = !this.allOnPageSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      page.forEach(r => shouldSelect ? next.add(r.id) : next.delete(r.id));
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  // ══════════════════════════════════════════════════════════════════════
  // Filter / search / sort / pagination handlers
  // ══════════════════════════════════════════════════════════════════════

  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  onSearchFieldChange(field: SearchField): void { this.searchField.set(field); this.currentPage.set(1); }
  setStatusFilter(status: 'all' | ReviewStatus): void { this.statusFilter.set(status); this.currentPage.set(1); }
  setRatingFilter(rating: RatingFilter): void { this.ratingFilter.set(rating); this.currentPage.set(1); }
  setVerifiedFilter(v: BoolFilter): void { this.verifiedFilter.set(v); this.currentPage.set(1); }
  setReportedFilter(v: BoolFilter): void { this.reportedFilter.set(v); this.currentPage.set(1); }
  setSort(key: SortKey): void { this.sortKey.set(key); }
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }
  toggleFilters(): void { this.filtersOpen.update(v => !v); }

  activeFilterCount = computed(() => {
    let n = 0;
    if (this.statusFilter() !== 'all') n++;
    if (this.ratingFilter() !== 'all') n++;
    if (this.verifiedFilter() !== 'all') n++;
    if (this.reportedFilter() !== 'all') n++;
    return n;
  });

  hasAnyActiveFilter = computed(() =>
    !!this.searchQuery() || this.activeFilterCount() > 0
  );

  clearFilters(): void {
    this.searchQuery.set('');
    this.searchField.set('all');
    this.statusFilter.set('all');
    this.ratingFilter.set('all');
    this.verifiedFilter.set('all');
    this.reportedFilter.set('all');
    this.currentPage.set(1);
  }

  setPageSize(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ─────────────────────────────────────────────────────────────
  toggleMenu(review: AdminReview, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === review.id ? null : review.id);
  }
  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.viewingReview.set(null);
    this.deletingReview.set(null);
    this.bulkDeleteCount.set(null);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Row-level moderation actions
  // ══════════════════════════════════════════════════════════════════════

  private updateStatus(id: string, status: ReviewStatus): void {
    this.allReviews.update(list => list.map(r => r.id === id ? { ...r, status } : r));
  }

  viewReview(review: AdminReview): void {
    this.closeMenu();
    this.viewingReview.set(toReviewDetail(review));
    // Viewing a review implicitly marks a brand-new one as read.
    if (review.status === 'new') this.updateStatus(review.id, 'read');
  }

  markRead(review: AdminReview, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.updateStatus(review.id, 'read');
    this.showToast(`Marked review by ${review.customerName} as read`);
  }

  approveReview(review: AdminReview, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.updateStatus(review.id, 'approved');
    this.showToast(`Approved review by ${review.customerName}`);
  }

  featureReview(review: AdminReview, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.updateStatus(review.id, 'featured');
    this.showToast(`Featured review by ${review.customerName}`);
  }

  flagReview(review: AdminReview, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.updateStatus(review.id, 'flagged');
    this.showToast(`Flagged review by ${review.customerName}`);
  }

  requestDelete(review: AdminReview, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.deletingReview.set(review);
  }

  // ── View modal wiring ────────────────────────────────────────────────────
  onViewModalClosed(): void { this.viewingReview.set(null); }

  onDeleteRequestedFromView(review: AdminReview): void {
    this.viewingReview.set(null);
    this.deletingReview.set(review);
  }

  // ── Delete modal wiring (single) ─────────────────────────────────────────
  cancelDelete(): void { this.deletingReview.set(null); this.bulkDeleteCount.set(null); }

  confirmDelete(): void {
    const target = this.deletingReview();
    if (target) {
      this.allReviews.update(list => list.filter(r => r.id !== target.id));
      this.selectedIds.update(set => { const next = new Set(set); next.delete(target.id); return next; });
      this.showToast(`Review by ${target.customerName} deleted`);
      this.deletingReview.set(null);
      return;
    }

    if (this.bulkDeleteCount() !== null) {
      const ids = this.selectedIds();
      this.allReviews.update(list => list.filter(r => !ids.has(r.id)));
      this.showToast(`${ids.size} review${ids.size === 1 ? '' : 's'} deleted`);
      this.clearSelection();
      this.bulkDeleteCount.set(null);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Bulk actions
  // ══════════════════════════════════════════════════════════════════════

  bulkMarkRead(): void { this.bulkUpdateStatus('read', 'Marked as read'); }
  bulkApprove(): void { this.bulkUpdateStatus('approved', 'Approved'); }
  bulkFeature(): void { this.bulkUpdateStatus('featured', 'Featured'); }

  private bulkUpdateStatus(status: ReviewStatus, label: string): void {
    const ids = this.selectedIds();
    if (!ids.size) return;
    this.allReviews.update(list => list.map(r => ids.has(r.id) ? { ...r, status } : r));
    this.showToast(`${label}: ${ids.size} review${ids.size === 1 ? '' : 's'}`);
    this.clearSelection();
  }

  bulkDelete(): void {
    const count = this.selectedIds().size;
    if (!count) return;
    this.bulkDeleteCount.set(count);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Reporting / export
  // ══════════════════════════════════════════════════════════════════════

  private reportRows(): AdminReview[] {
    // Report covers the full filtered dataset, not just the current page.
    return this.sortedReviews();
  }

  private toCsv(rows: AdminReview[]): string {
    const header = ['Customer', 'Email', 'Product', 'Rating', 'Status', 'Verified', 'Helpful Votes', 'Date', 'Review Title', 'Review Body'];
    const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

    const lines = rows.map(r => [
      r.customerName, r.customerEmail, r.productName, r.rating, r.status,
      r.verifiedPurchase ? 'Verified' : 'Not Verified', r.helpfulVotes,
      this.formatDate(r.createdAt), r.title, r.review,
    ].map(escape).join(','));

    return [header.map(escape).join(','), ...lines].join('\n');
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadReport(): void {
    const csv = this.toCsv(this.reportRows());
    this.downloadFile(csv, `reviews-report-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    this.showToast('Report downloaded');
  }

  exportCsv(): void {
    const csv = this.toCsv(this.reportRows());
    this.downloadFile(csv, `reviews-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    this.showToast('CSV exported');
  }

  // ══════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════

  starsFor(rating: number): { filled: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({ filled: i < Math.round(rating) }));
  }

  statusLabel(status: ReviewStatus): string {
    const map: Record<ReviewStatus, string> = {
      new: 'New', read: 'Read', approved: 'Approved', featured: 'Featured', flagged: 'Flagged',
    };
    return map[status];
  }

  initialsFor(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Mock data generation (~50 realistic reviews)
  // ══════════════════════════════════════════════════════════════════════

  private generateMockReviews(): AdminReview[] {
    const firstNames = ['Ayoub', 'Sara', 'Karim', 'Leila', 'Youssef', 'Nadia', 'Omar', 'Salma', 'Amine', 'Hind',
      'Reda', 'Fatima', 'Yassine', 'Meriem', 'Hamza', 'Ines', 'Adil', 'Zineb', 'Anas', 'Rania',
      'Marc', 'Sophie', 'Julien', 'Claire', 'Thomas', 'Emma', 'Lucas', 'Chloe'];
    const lastNames = ['Hennani', 'Idrissi', 'Mansouri', 'Boudali', 'Alami', 'Cherkaoui', 'Bennis', 'Fassi',
      'Tazi', 'Amrani', 'Berger', 'Lefevre', 'Moreau', 'Girard', 'Dubois', 'Martin'];

    const products: { id: string; name: string; image: string }[] = [
      { id: 'p1', name: 'WH-XM6 Wireless ANC', image: '/products/headphones.png' },
      { id: 'p2', name: 'AirPods Pro 2nd Gen', image: '/products/airpods pro w1.png' },
      { id: 'p3', name: 'Galaxy S24 Ultra', image: '/products/samsung galxy s24 ultra silver.png' },
      { id: 'p4', name: 'MacBook Pro M3', image: '/products/macbook pro 13.png' },
      { id: 'p5', name: 'Ultra Watch Series 3', image: '/products/appel watch.png' },
      { id: 'p6', name: 'Galaxy Buds Pro 2', image: '/products/airpods pro b1.png' },
    ];

    const titlesByRating: Record<number, string[]> = {
      5: ['Absolutely worth every penny', 'Exceeded my expectations', 'Best purchase this year', 'Flawless from day one'],
      4: ['Really solid, minor gripes', 'Great value overall', 'Very happy with this', 'Does everything I need'],
      3: ['Good, but not great', 'Decent for the price', 'It\'s okay, some issues', 'Mixed feelings about this'],
      2: ['Disappointed with quality', 'Not what I expected', 'Several issues out of the box', 'Wouldn\'t buy again'],
      1: ['Terrible experience', 'Broke within a week', 'Complete waste of money', 'Avoid this product'],
    };

    const bodiesByRating: Record<number, string[]> = {
      5: [
        'This has completely exceeded my expectations. The build quality feels premium and it performs flawlessly every single day. Shipping was fast and packaging was excellent.',
        'I\'ve been using this for a few weeks now and I\'m consistently impressed. Battery life is fantastic and the overall experience feels polished.',
      ],
      4: [
        'Overall a great product for the price. There are a couple of minor quirks but nothing that would stop me from recommending it to friends.',
        'Works exactly as advertised. Setup was simple and performance has been consistent. Docked one star for a slightly bulky design.',
      ],
      3: [
        'It does the job but nothing about it feels special. Some features work well, others feel like an afterthought. Customer support was slow to respond.',
        'Average experience overall. Performance is fine for basic use but struggles a bit under heavier workloads.',
      ],
      2: [
        'Had high hopes but the actual experience was underwhelming. Ran into a couple of bugs that made me question the quality control here.',
        'Build quality feels cheaper than expected for the price point. Had to contact support twice already.',
      ],
      1: [
        'Stopped working properly within days of receiving it. Very disappointed given the price and the reviews I read beforehand.',
        'Arrived with visible defects and customer service has been unhelpful in resolving the issue.',
      ],
    };

    const reviews: AdminReview[] = [];
    const statuses: ReviewStatus[] = ['new', 'read', 'approved', 'featured', 'flagged'];
    const now = Date.now();

    for (let i = 0; i < 52; i++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[(i * 3) % lastNames.length];
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}@${['gmail.com', 'outlook.com', 'yahoo.com', 'mail.com'][i % 4]}`;

      const product = products[i % products.length];

      // Weighted rating distribution — mostly positive, some negative.
      const ratingPool = [5, 5, 5, 4, 4, 4, 3, 3, 2, 1];
      const rating = ratingPool[i % ratingPool.length];

      const status = statuses[(i * 2 + (rating <= 2 ? 1 : 0)) % statuses.length];
      const daysAgo = (i * 5) % 180;
      const createdAt = new Date(now - daysAgo * 86400000 - i * 3600000).toISOString();

      const titles = titlesByRating[rating];
      const bodies = bodiesByRating[rating];

      reviews.push({
        id: 'rev-' + i,
        customerName: name,
        customerEmail: email,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        rating,
        title: titles[i % titles.length],
        review: bodies[i % bodies.length],
        status,
        verifiedPurchase: i % 3 !== 0,
        helpfulVotes: (i * 13) % 260,
        reported: rating <= 2 && i % 4 === 0,
        createdAt,
      });
    }

    return reviews;
  }
}

