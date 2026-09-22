import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../core/services/seo.service';
import { CALCULATOR_REGISTRY, CalculatorCategory } from './calculator-registry';

@Component({
  selector: 'app-calculators-hub',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calculators-hub.html',
  styleUrl: './calculators-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorsHubPage {
  private readonly seoService = inject(SeoService);

  readonly calculators = CALCULATOR_REGISTRY;
  readonly categories: { id: CalculatorCategory; label: string }[] = [
    { id: 'business-finance', label: 'Business & Finance' },
    { id: 'loans', label: 'Loans & Credit' },
    { id: 'taxes-pricing', label: 'Taxes & Pricing' },
    { id: 'payments', label: 'Payments & Currency' },
    { id: 'freelance', label: 'Freelance & Rates' },
    { id: 'inventory', label: 'Inventory & Operations' },
  ];

  readonly groupedCalculators = computed(() => this.categories.map(category => ({
    ...category,
    calculators: this.calculators.filter(calculator => calculator.category === category.id),
  })).filter(group => group.calculators.length));

  constructor() {
    this.seoService.updateMetadata({
      title: 'Financial Calculators — Free Business, Loan & Pricing Tools | X-Facture',
      description: 'Free online financial calculators for business, loans, pricing, taxes, payments, freelance rates and inventory. Fast, practical tools from X-Facture.',
      keywords: 'financial calculators, business calculator, finance calculator, loan calculator, pricing calculator, VAT calculator, freelance calculator, inventory calculator',
      url: 'https://x-facture.com/calculators',
    });
  }
}
