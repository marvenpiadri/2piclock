import { CALCULATOR_REGISTRY, type CalculatorCategory } from '../../calculators/calculator-registry';

export interface FinanceToolConfig {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: 'Business Finance' | 'Loans & Financing' | 'Pricing & Tax' | 'Payments & Fees' | 'Freelance & Rates' | 'Inventory & Operations';
  description: string;
  icon: string;
  badge?: string;
  route: string;
  popular?: boolean;
}

const CATEGORY_LABELS: Record<CalculatorCategory, FinanceToolConfig['category']> = {
  'business-finance': 'Business Finance',
  loans: 'Loans & Financing',
  'taxes-pricing': 'Pricing & Tax',
  payments: 'Payments & Fees',
  freelance: 'Freelance & Rates',
  inventory: 'Inventory & Operations',
};

const ICONS: Record<string, string> = {
  'stripe-paypal-fee-calculator':'credit_card',
  'gross-margin-markup-calculator':'trending_up',
  'sales-tax-vat-splitter':'percent',
  'cash-burn-runway-calculator':'speed',
  'break-even-sales-calculator':'balance',
  'commercial-loan-emi-calculator':'account_balance',
  'late-fee-interest-calculator':'warning',
  'hourly-freelance-rate-calculator':'timer',
  'compound-working-capital-calculator':'insights',
  'inventory-turnover-holding-calculator':'inventory',
  'currency-exchange-fee-calculator':'currency_exchange',
  'cash-register-change-calculator':'point_of_sale',
  'roi-calculator':'monitoring',
  'roas-calculator':'campaign',
  'customer-acquisition-cost-calculator':'person_add',
  'customer-lifetime-value-calculator':'loyalty',
  'cagr-calculator':'show_chart',
  'discount-calculator':'sell',
  'net-profit-margin-calculator':'account_balance',
  'contribution-margin-calculator':'donut_small',
  'percentage-change-calculator':'percent',
  'price-increase-calculator':'trending_up',
  'debt-to-income-calculator':'credit_score',
  'loan-payoff-calculator':'schedule',
  'gross-profit-calculator':'payments',
  'operating-margin-calculator':'query_stats',
  'average-order-value-calculator':'shopping_cart',
  'conversion-rate-calculator':'conversion_path',
  'churn-rate-calculator':'person_remove',
  'customer-retention-rate-calculator':'people',
  'sales-commission-calculator':'handshake',
  'payback-period-calculator':'history',
  'revenue-growth-calculator':'show_chart',
  'inventory-days-calculator':'inventory_2',
  'reorder-point-calculator':'low_priority',
};

const POPULAR = new Set([
  'stripe-paypal-fee-calculator',
  'gross-margin-markup-calculator',
  'sales-tax-vat-splitter',
  'cash-burn-runway-calculator',
  'break-even-sales-calculator',
  'roi-calculator',
  'customer-acquisition-cost-calculator',
  'customer-lifetime-value-calculator',
]);

const BADGES: Record<string, string> = {
  'stripe-paypal-fee-calculator':'Popular',
  'gross-margin-markup-calculator':'Essential',
  'sales-tax-vat-splitter':'Tax',
  'cash-burn-runway-calculator':'SaaS / Startup',
  'cash-register-change-calculator':'POS',
};

function shortTitle(name: string): string {
  return name.replace(/ Calculator(?: —.*)?$/, '').replace(/\s+\|.*$/, '');
}

export const FINANCE_TOOLS: FinanceToolConfig[] = CALCULATOR_REGISTRY.map(calculator => ({
  id: calculator.slug.replace(/-calculator$/, ''),
  slug: calculator.slug,
  title: calculator.name,
  shortTitle: shortTitle(calculator.name),
  category: CATEGORY_LABELS[calculator.category],
  description: calculator.description,
  icon: ICONS[calculator.slug] ?? 'calculate',
  badge: BADGES[calculator.slug] ?? (POPULAR.has(calculator.slug) ? 'Popular' : undefined),
  route: `/calculators/${calculator.slug}`,
  popular: POPULAR.has(calculator.slug),
}));

export const FINANCE_TOOL_CATEGORIES = Array.from(
  new Set(FINANCE_TOOLS.map(tool => tool.category))
);
