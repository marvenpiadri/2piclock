import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect,
  AfterViewInit,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { Chart, registerables } from 'chart.js';
import { CalculatorLayoutComponent, FintechCardComponent } from '../../shared/components';

Chart.register(...registerables);

interface BreakEvenPreset {
  name: string;
  fixedCosts: number;
  variableCost: number;
  price: number;
}

@Component({
  selector: 'app-break-even-sales-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './break-even-sales-calculator.component.html',
  styleUrl: './break-even-sales-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakEvenSalesCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private seoService = inject(SeoService);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.seoService.updateMetadata({
      title: 'Break-Even Point Calculator — Units, Revenue & Contribution Margin | X-Facture',
      description: 'Calculate your business break-even point in units and sales revenue. Analyze contribution margin and fixed costs with an interactive break-even chart.',
      keywords: 'break-even calculator, break even point calculator, break-even units, break-even revenue, contribution margin calculator, fixed cost calculator',
      url: 'https://x-facture.com/calculators/break-even-sales-calculator',
      image: 'https://x-facture.com/x-facture-LOGO-PFP.png'
    });

    this.seoService.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Break-Even Point Calculator',
      url: 'https://x-facture.com/calculators/break-even-sales-calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      isAccessibleForFree: true,
      description: 'Business break-even point, unit volume, contribution margin, and revenue analysis tool.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
  }

  readonly presets: BreakEvenPreset[] = [
    { name: 'SaaS Startup', fixedCosts: 15000, variableCost: 5, price: 49 },
    { name: 'Coffee Shop', fixedCosts: 4500, variableCost: 0.8, price: 4.5 },
    { name: 'Freelance Pro', fixedCosts: 1200, variableCost: 0, price: 150 },
    { name: 'E-commerce', fixedCosts: 3000, variableCost: 22, price: 55 },
  ];

  fixedCosts = signal<number>(5000);
  variableCostPerUnit = signal<number>(20);
  sellingPricePerUnit = signal<number>(50);

  results = computed(() => {
    const fixed = Math.max(0, Number(this.fixedCosts()) || 0);
    const variable = Math.max(0, Number(this.variableCostPerUnit()) || 0);
    const price = Math.max(0, Number(this.sellingPricePerUnit()) || 0);

    const contributionMargin = price - variable;
    const contributionMarginRatio = price > 0 ? contributionMargin / price : 0;
    const breakEvenUnits = fixed === 0 ? 0 : contributionMargin > 0 ? Math.ceil(fixed / contributionMargin) : null;
    const breakEvenRevenue = breakEvenUnits === null ? null : breakEvenUnits * price;

    return {
      contributionMargin,
      contributionMarginRatio,
      breakEvenUnits,
      breakEvenRevenue,
      fixed,
      variable,
      price,
      isAchievable: breakEvenUnits !== null
    };
  });

  constructor() {
    effect(() => this.updateChart());
  }

  ngAfterViewInit(): void { this.initChart(); }

  ngOnDestroy(): void { this.chartInstance?.destroy(); }

  setPreset(p: BreakEvenPreset): void {
    this.fixedCosts.set(p.fixedCosts);
    this.variableCostPerUnit.set(p.variableCost);
    this.sellingPricePerUnit.set(p.price);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();
    const breakEvenUnits = res.breakEvenUnits ?? 100;
    const maxUnits = breakEvenUnits > 0 ? breakEvenUnits * 2 : 100;
    const step = Math.max(1, Math.ceil(maxUnits / 10));
    const labels = Array.from({ length: 11 }, (_, i) => i * step);

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Total Revenue', data: labels.map(u => u * res.price), borderColor: '#00e676', backgroundColor: 'rgba(0, 230, 118, 0.1)', fill: true, tension: 0.1 },
          { label: 'Total Costs', data: labels.map(u => res.fixed + (u * res.variable)), borderColor: '#f85149', backgroundColor: 'rgba(248, 81, 73, 0.1)', fill: true, tension: 0.1 },
          { label: 'Fixed Costs', data: labels.map(() => res.fixed), borderColor: '#30363d', borderDash: [5, 5], fill: false, tension: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e' } },
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e' }, title: { display: true, text: 'Units Sold', color: '#8b949e' } }
        },
        plugins: {
          legend: { labels: { color: '#c9d1d9' } },
          tooltip: { backgroundColor: '#161b22', titleColor: '#ffffff', bodyColor: '#c9d1d9', borderColor: '#30363d', borderWidth: 1 }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;
    const res = this.results();
    const breakEvenUnits = res.breakEvenUnits ?? 100;
    const maxUnits = breakEvenUnits > 0 ? breakEvenUnits * 2 : 100;
    const step = Math.max(1, Math.ceil(maxUnits / 10));
    const labels = Array.from({ length: 11 }, (_, i) => i * step);

    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets[0].data = labels.map(u => u * res.price);
    this.chartInstance.data.datasets[1].data = labels.map(u => res.fixed + (u * res.variable));
    this.chartInstance.data.datasets[2].data = labels.map(() => res.fixed);
    this.chartInstance.update('none');
  }
}
