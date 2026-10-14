// update-order.ts
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';
import { OrderService } from '../../services/order.service';
import { Order, OrderFormValue } from '../../model/order.model';
import { OrderForm } from '../order-form/order-form';

@Component({
  selector: 'app-update-order',
  imports: [OrderForm, RouterLink, TranslatePipe],
  templateUrl: './update-order.html',
  styleUrl: './update-order.scss',
})
export class UpdateOrder implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  protected lang = inject(LanguageService);

  // ── Route / load state ─────────────────────────────────────────────────
  orderId = signal('');
  order = signal<Order | null>(null);
  isLoading = signal(true);
  loadError = signal<'notFound' | 'failed' | null>(null);

  // ── Save state ─────────────────────────────────────────────────────────
  saving = signal(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer: any;
  private navTimer: any;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orderId.set(id);
    this.loadOrder();
  }

  async loadOrder(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const found = await this.orderService.load(this.orderId());
      if (found) this.order.set(found);
      else this.loadError.set('notFound');
    } catch {
      this.loadError.set('failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit(value: OrderFormValue): Promise<void> {
    const current = this.order();
    if (!current || this.saving()) return;
    this.saving.set(true);
    try {
      const saved = await this.orderService.update(current.id, value);
      if (saved.lastUpdated === current.lastUpdated) {
        // Nothing actually changed once locked fields / whitespace were ignored.
        this.showToast(this.lang.translate('orders.form.toasts.noChanges'), 'success');
        this.saving.set(false);
        return;
      }
      this.showToast(this.lang.translate('orders.form.toasts.updated', { order: saved.orderNumber }), 'success');
      // Keep the form locked (saving) until we leave, so it can't be submitted twice.
      this.navTimer = setTimeout(() => this.router.navigate(['/admin/orders']), 900);
    } catch {
      this.showToast(this.lang.translate('orders.form.toasts.updateFailed'), 'error');
      this.saving.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/orders']);
  }

  private showToast(text: string, kind: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 2800);
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
    clearTimeout(this.navTimer);
  }
}