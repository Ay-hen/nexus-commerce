import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentGateway, PaymentGatewayId } from '../../../../model/settings.model';
import { LanguageService } from '../../../../../localization/language.service';
import { TranslatePipe } from '../../../../../localization/translate.pipe';

@Component({
  selector: 'app-payments-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './payments-settings.html',
  styleUrl: './payments-settings.scss',
})
export class PaymentsSettingsComponent {
  lang = inject(LanguageService);

  // Same contract as the previous sections: the parent owns the
  // SettingsModel draft/saved array + dirty tracking; this component only
  // renders + edits individual gateways within `payments` and reports
  // patches upward by gateway id.
  @Input({ required: true }) gateways!: PaymentGateway[];

  @Output() gatewayChange = new EventEmitter<{ id: PaymentGatewayId; patch: Partial<PaymentGateway> }>();
  @Output() save = new EventEmitter<void>();

  // ── Reveal toggles for masked API key / secret inputs (local-only UI
  // state — never part of the saved model, same as the change-password
  // fields in Security). ──
  private revealedKeys = signal<Set<string>>(new Set());

  update(id: PaymentGatewayId, patch: Partial<PaymentGateway>): void {
    this.gatewayChange.emit({ id, patch });
  }

  toggleReveal(key: string): void {
    this.revealedKeys.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  isRevealed(key: string): boolean {
    return this.revealedKeys().has(key);
  }

  gatewayIconKind(id: PaymentGatewayId): 'stripe' | 'paypal' | 'cod' | 'bank' {
    if (id === 'stripe' || id === 'paypal' || id === 'cod') return id;
    return 'bank';
  }

  trackById(_: number, gw: PaymentGateway): PaymentGatewayId {
    return gw.id;
  }
}