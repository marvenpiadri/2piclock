import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CalculatorLayoutComponent } from '../../shared/components/calculator-layout/calculator-layout';
import { CalculatorDefinition, getCalculatorBySlug } from '../calculator-registry';
import { ADDITIONAL_CALCULATORS } from '../additional-calculators';

type CalculatorInput = readonly [key: string, label: string, defaultValue: number, unit?: string];

@Component({
  selector: 'app-simple-finance-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, CalculatorLayoutComponent],
  templateUrl: './simple-finance-calculator.html',
  styleUrl: './simple-finance-calculator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleFinanceCalculatorComponent {
  private readonly route = inject(ActivatedRoute);
  readonly slug = this.route.snapshot.routeConfig?.path?.replace('calculators/', '') ?? '';
  readonly definition = computed<CalculatorDefinition>(() => getCalculatorBySlug(this.slug) ?? ADDITIONAL_CALCULATORS[0]);
  readonly values = signal<Record<string, number>>({ a: 1000, b: 1200, c: 10, d: 20 });

  set(key: string, value: string | number): void {
    const n = Number(value);
    this.values.update(v => ({ ...v, [key]: Number.isFinite(n) ? n : 0 }));
  }

  value(key: string): number { return this.values()[key] ?? 0; }

  readonly result = computed(() => {
    const v = this.values();
    const s = this.slug;
    const a = Number(v['a']) || 0;
    const b = Number(v['b']) || 0;
    const c = Number(v['c']) || 0;
    const d = Number(v['d']) || 0;

    if (s === 'roi-calculator') return { primary: a ? ((b - a) / a) * 100 : 0, label: 'Return on investment', unit: '%', secondary: b - a, secondaryLabel: 'Net gain', prefix: '$' };
    if (s === 'roas-calculator') return { primary: a ? b / a : 0, label: 'ROAS', unit: 'x', secondary: a ? (b / a) * 100 : 0, secondaryLabel: 'ROAS percentage', prefix: '' };
    if (s === 'customer-acquisition-cost-calculator') return { primary: b ? a / b : 0, label: 'Customer acquisition cost', unit: '', secondary: b, secondaryLabel: 'New customers', prefix: '$' };
    if (s === 'customer-lifetime-value-calculator') { const revenue = a * b * c; return { primary: revenue, label: 'Customer lifetime value', unit: '', secondary: revenue * d / 100, secondaryLabel: 'Gross-profit LTV', prefix: '$' }; }
    if (s === 'cagr-calculator') return { primary: a > 0 && c > 0 ? ((b / a) ** (1 / c) - 1) * 100 : 0, label: 'Compound annual growth rate', unit: '%', secondary: b - a, secondaryLabel: 'Total change', prefix: '$' };
    if (s === 'net-profit-margin-calculator') return { primary: a ? (b / a) * 100 : 0, label: 'Net profit margin', unit: '%', secondary: b, secondaryLabel: 'Net profit', prefix: '$' };
    if (s === 'contribution-margin-calculator') { const contribution = a - b; return { primary: a ? (contribution / a) * 100 : 0, label: 'Contribution margin ratio', unit: '%', secondary: contribution, secondaryLabel: 'Contribution margin', prefix: '$' }; }
    if (s === 'percentage-change-calculator') return { primary: a ? ((b - a) / a) * 100 : 0, label: 'Percentage change', unit: '%', secondary: b - a, secondaryLabel: 'Absolute change', prefix: '' };
    if (s === 'price-increase-calculator') { const increase = a * (b / 100); return { primary: a + increase, label: 'New price', unit: '', secondary: increase, secondaryLabel: 'Increase amount', prefix: '$' }; }
    if (s === 'debt-to-income-calculator') return { primary: b ? (a / b) * 100 : 0, label: 'Debt-to-income ratio', unit: '%', secondary: a, secondaryLabel: 'Monthly debt', prefix: '$' };
    if (s === 'loan-payoff-calculator') {
      const monthlyRate = b / 100 / 12;
      const months = monthlyRate > 0 && c > a * monthlyRate ? -Math.log(1 - (a * monthlyRate) / c) / Math.log(1 + monthlyRate) : monthlyRate === 0 && c > 0 ? a / c : 0;
      return { primary: months, label: 'Estimated payoff time', unit: ' months', secondary: months / 12, secondaryLabel: 'Approx. years', prefix: '' };
    }
    if (s === 'gross-profit-calculator') { const profit = a - b; return { primary: profit, label: 'Gross profit', unit: '', secondary: a ? profit / a * 100 : 0, secondaryLabel: 'Gross margin', prefix: '$' }; }
    if (s === 'operating-margin-calculator') return { primary: a ? b / a * 100 : 0, label: 'Operating margin', unit: '%', secondary: b, secondaryLabel: 'Operating profit', prefix: '$' };
    if (s === 'average-order-value-calculator') return { primary: b ? a / b : 0, label: 'Average order value', unit: '', secondary: b, secondaryLabel: 'Orders', prefix: '$' };
    if (s === 'conversion-rate-calculator') return { primary: a ? b / a * 100 : 0, label: 'Conversion rate', unit: '%', secondary: b, secondaryLabel: 'Conversions', prefix: '' };
    if (s === 'churn-rate-calculator') return { primary: a ? b / a * 100 : 0, label: 'Customer churn rate', unit: '%', secondary: 100 - (a ? b / a * 100 : 0), secondaryLabel: 'Retention rate', prefix: '' };
    if (s === 'customer-retention-rate-calculator') { const retained = b - c; return { primary: a ? retained / a * 100 : 0, label: 'Customer retention rate', unit: '%', secondary: retained, secondaryLabel: 'Starting customers retained', prefix: '' }; }
    if (s === 'sales-commission-calculator') return { primary: a * b / 100, label: 'Commission earned', unit: '', secondary: b, secondaryLabel: 'Commission rate', prefix: '$' };
    if (s === 'payback-period-calculator') return { primary: b ? a / b : 0, label: 'Payback period', unit: ' periods', secondary: b, secondaryLabel: 'Cash benefit per period', prefix: '' };
    if (s === 'revenue-growth-calculator') return { primary: a ? (b - a) / a * 100 : 0, label: 'Revenue growth', unit: '%', secondary: b - a, secondaryLabel: 'Revenue change', prefix: '$' };
    if (s === 'inventory-days-calculator') return { primary: b ? a / b * 365 : 0, label: 'Inventory days', unit: ' days', secondary: b ? b / a : 0, secondaryLabel: 'Annual turnover', prefix: '' };
    if (s === 'reorder-point-calculator') return { primary: a * b + c, label: 'Reorder point', unit: ' units', secondary: c, secondaryLabel: 'Safety stock', prefix: '' };

    const discount = a * d / 100;
    return { primary: a - discount, label: 'Sale price', unit: '', secondary: discount, secondaryLabel: 'You save', prefix: '$' };
  });

  readonly inputConfig = computed<readonly CalculatorInput[]>(() => {
    if (this.slug === 'roi-calculator') return [['a', 'Investment cost', 1000, '$'], ['b', 'Final value / return', 1200, '$']];
    if (this.slug === 'roas-calculator') return [['a', 'Advertising spend', 1000, '$'], ['b', 'Attributed revenue', 4000, '$']];
    if (this.slug === 'customer-acquisition-cost-calculator') return [['a', 'Sales & marketing cost', 5000, '$'], ['b', 'New customers', 50, 'customers']];
    if (this.slug === 'customer-lifetime-value-calculator') return [['a', 'Average order value', 100, '$'], ['b', 'Purchases per year', 6, '/ year'], ['c', 'Customer lifespan', 3, 'years'], ['d', 'Gross margin', 20, '%']];
    if (this.slug === 'cagr-calculator') return [['a', 'Starting value', 10000, '$'], ['b', 'Ending value', 15000, '$'], ['c', 'Years', 5, 'years']];
    if (this.slug === 'net-profit-margin-calculator') return [['a', 'Revenue', 100000, '$'], ['b', 'Net profit', 12000, '$']];
    if (this.slug === 'contribution-margin-calculator') return [['a', 'Sales', 100000, '$'], ['b', 'Variable costs', 60000, '$']];
    if (this.slug === 'percentage-change-calculator') return [['a', 'Original value', 100, ''], ['b', 'New value', 125, '']];
    if (this.slug === 'price-increase-calculator') return [['a', 'Current price', 100, '$'], ['b', 'Increase rate', 10, '%']];
    if (this.slug === 'debt-to-income-calculator') return [['a', 'Monthly debt payments', 1500, '$'], ['b', 'Gross monthly income', 5000, '$']];
    if (this.slug === 'loan-payoff-calculator') return [['a', 'Outstanding balance', 10000, '$'], ['b', 'Annual interest rate', 8, '%'], ['c', 'Monthly payment', 300, '$']];
    if (this.slug === 'gross-profit-calculator') return [['a', 'Revenue', 100000, '$'], ['b', 'Cost of goods sold', 60000, '$']];
    if (this.slug === 'operating-margin-calculator') return [['a', 'Revenue', 100000, '$'], ['b', 'Operating profit', 15000, '$']];
    if (this.slug === 'average-order-value-calculator') return [['a', 'Total revenue', 25000, '$'], ['b', 'Number of orders', 250, 'orders']];
    if (this.slug === 'conversion-rate-calculator') return [['a', 'Visitors / opportunities', 10000, 'visitors'], ['b', 'Conversions', 350, 'conversions']];
    if (this.slug === 'churn-rate-calculator') return [['a', 'Customers at start', 1000, 'customers'], ['b', 'Customers lost', 50, 'lost']];
    if (this.slug === 'customer-retention-rate-calculator') return [['a', 'Customers at start', 1000, 'customers'], ['b', 'Customers at end', 980, 'customers'], ['c', 'New customers', 80, 'new']];
    if (this.slug === 'sales-commission-calculator') return [['a', 'Eligible sales', 10000, '$'], ['b', 'Commission rate', 7, '%']];
    if (this.slug === 'payback-period-calculator') return [['a', 'Initial investment', 50000, '$'], ['b', 'Cash benefit per period', 5000, '$ / period']];
    if (this.slug === 'revenue-growth-calculator') return [['a', 'Previous revenue', 80000, '$'], ['b', 'Current revenue', 100000, '$']];
    if (this.slug === 'inventory-days-calculator') return [['a', 'Average inventory', 50000, '$'], ['b', 'Annual COGS', 300000, '$']];
    if (this.slug === 'reorder-point-calculator') return [['a', 'Average daily demand', 40, 'units / day'], ['b', 'Lead time', 7, 'days'], ['c', 'Safety stock', 60, 'units']];
    return [['a', 'Original price', 100, '$'], ['d', 'Discount rate', 20, '%']];
  });

  display(value: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
}
