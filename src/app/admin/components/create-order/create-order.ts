// create-order.ts
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';
import { OrderService } from '../../services/order.service';
import { OrderFormValue } from '../../model/order.model';
import { OrderForm } from '../order-form/order-form';

@Component({
  selector: 'app-create-order',
  imports: [OrderForm, TranslatePipe],
  templateUrl: './create-order.html',
  styleUrl: './create-order.scss',
})
export class CreateOrder implements OnDestroy {
  private router = inject(Router);
  private orderService = inject(OrderService);
  protected lang = inject(LanguageService);

  saving = signal(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer: any;
  private navTimer: any;

  async onSubmit(value: OrderFormValue): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const order = await this.orderService.create(value);
      this.showToast(this.lang.translate('orders.form.toasts.created', { order: order.orderNumber }), 'success');
      // Keep the form locked (saving) until we leave, so it can't be submitted twice.
      this.navTimer = setTimeout(() => this.router.navigate(['/admin/orders']), 900);
    } catch {
      this.showToast(this.lang.translate('orders.form.toasts.createFailed'), 'error');
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