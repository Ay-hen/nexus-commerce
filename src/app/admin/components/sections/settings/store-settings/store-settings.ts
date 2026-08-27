import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreSettings, StoreStatus, WAREHOUSE_OPTIONS } from '../../../../model/settings.model';
import { LanguageService } from '../../../../../localization/language.service';
import { TranslatePipe } from '../../../../../localization/translate.pipe';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss',
})
export class StoreSettingsComponent {
  lang = inject(LanguageService);

  // Same Input/Output contract as the previous sections: parent owns the
  // SettingsModel draft/saved + dirty tracking; this component only
  // renders + edits the `store` slice and reports patches upward.
  @Input({ required: true }) settings!: StoreSettings;

  @Output() settingsChange = new EventEmitter<Partial<StoreSettings>>();
  @Output() save = new EventEmitter<void>();

  warehouseOptions = WAREHOUSE_OPTIONS;
  storeStatusOptions: StoreStatus[] = ['Open', 'Closed', 'Coming Soon'];

  update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<StoreSettings>);
  }

  storeStatusKey(s: StoreStatus): string {
    const map: Record<StoreStatus, string> = { 'Open': 'open', 'Closed': 'closed', 'Coming Soon': 'comingSoon' };
    return 'settings.store.status.' + map[s];
  }

  // ── Asset uploads (mock — same placeholder behavior as before: no
  // backend endpoint yet, so this just clears the file input; a real
  // implementation would read the File, upload it, and patch the
  // corresponding *Url field with the returned URL). ──
  onAssetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = '';
  }

  // ── Live checkout preview ─────────────────────────────────────────────
  // Plain methods, not computed(): `settings` is a regular @Input, not a
  // signal, so these need to re-evaluate on every CD pass rather than
  // memoizing a stale first read (same rationale as General's previews).
  samplePrice(): number {
    return 49.99;
  }

  previewShippingCost(): number {
    if (!this.settings) return 0;
    return this.samplePrice() >= this.settings.freeShippingThreshold ? 0 : this.settings.shippingFee;
  }

  previewTax(): number {
    if (!this.settings) return 0;
    return +(this.samplePrice() * (this.settings.taxPercentage / 100)).toFixed(2);
  }

  previewTotal(): number {
    return +(this.samplePrice() + this.previewShippingCost() + this.previewTax()).toFixed(2);
  }

  formatCurrency(v: number): string {
    return this.lang.formatCurrency(v);
  }
}