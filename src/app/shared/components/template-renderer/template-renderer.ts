import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessDocument } from '../../../core/models/document.model';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-template-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-renderer.html',
  styleUrl: './template-renderer.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateRendererComponent {
  private currencyService = inject(CurrencyService);

  document = input.required<BusinessDocument>();
  templateId = input<string>();
  paperSize = input<string>();

  // Derived active template ID (allows preview bar to switch live)
  activeTemplate = computed(() => {
    return this.templateId() || this.document().templateId || 'modern';
  });

  // Derived active paper size
  activePaperSize = computed(() => {
    return this.paperSize() || this.document().paperSize || 'a4';
  });

  currencySymbol = computed(() => {
    return this.currencyService.getSymbol(this.document().currency);
  });

  formatCurrency(amount: number | undefined | null): string {
    return this.currencyService.format(amount, this.document().currency);
  }
}
