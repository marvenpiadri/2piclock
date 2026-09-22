import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { CALCULATOR_REGISTRY, getCalculatorBySlug } from '../../../calculators/calculator-registry';

@Component({
  selector: 'app-calculator-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calculator-layout.html',
  styleUrl: './calculator-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorLayoutComponent {
  private readonly router = inject(Router);

  constructor() {
    // Instantiate the route-driven SEO service for every calculator page.
    inject(SeoService);
  }

  title = input<string>('');
  subtitle = input<string>('');
  icon = input<string>('tune');
  currentToolName = input<string>('');
  showAdsense = input<boolean>(true);

  readonly calculator = computed(() => {
    const path = this.router.url.split('?')[0].split('#')[0];
    const slug = path.split('/').filter(Boolean).pop() ?? '';
    return getCalculatorBySlug(slug);
  });

  readonly relatedCalculators = computed(() => {
    const current = this.calculator();
    if (!current) return [];

    return (current.related ?? [])
      .map(slug => getCalculatorBySlug(slug))
      .filter((calculator): calculator is NonNullable<typeof calculator> => !!calculator);
  });

  readonly categoryLabel = computed(() => {
    const category = this.calculator()?.category;
    const labels: Record<string, string> = {
      'business-finance': 'Business Finance',
      loans: 'Loans & Credit',
      'taxes-pricing': 'Tax & Pricing',
      payments: 'Payments & FX',
      freelance: 'Freelance & Rates',
      inventory: 'Inventory & Operations',
    };
    return category ? labels[category] ?? 'Finance' : 'Finance';
  });

  readonly calculatorCount = CALCULATOR_REGISTRY.length;
}
