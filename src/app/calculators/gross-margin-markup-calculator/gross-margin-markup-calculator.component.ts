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
import { CalculatorLayoutComponent } from '../../shared/components/calculator-layout/calculator-layout';

Chart.register(...registerables);

@Component({
  selector: 'app-gross-margin-markup-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent],
  templateUrl: './gross-margin-markup-calculator.component.html',
  styleUrl: './gross-margin-markup-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrossMarginMarkupCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private seoService = inject(SeoService);
  readonly Math = Math;

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.seoService.updateMetadata({
      title: 'Gross Margin vs. Markup Calculator | Profit Formula & Pricing | X-Facture',
      description: 'Convert between gross margin and markup, calculate selling prices from COGS, and estimate product profit with an interactive business pricing calculator.',
      keywords: 'gross margin calculator, markup calculator, margin vs markup formula, COGS calculator, retail price calculator',
      url: 'https://x-facture.com/calculators/gross-margin-markup-calculator',
      image: 'https://x-facture.com/x-facture-LOGO-PFP.png'
    });

    this.seoService.setJsonLd({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Gross Margin & Markup Calculator',
      url: 'https://x-facture.com/calculators/gross-margin-markup-calculator', applicationCategory: 'FinanceApplication',
      operatingSystem: 'All', isAccessibleForFree: true,
      description: 'Business pricing tool to compute gross profit margins, markups, selling prices, and product profit.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
  }

  mode = signal<'target-margin' | 'price-analysis'>('target-margin');
  cogs = signal<number>(45);
  targetMargin = signal<number>(40);
  sellingPriceInput = signal<number>(75);
  quantityUnits = signal<number>(100);

  results = computed(() => {
    const cost = Math.max(0.01, Number(this.cogs()) || 0.01);
    const qty = Math.max(1, Number(this.quantityUnits()) || 1);
    let finalPrice = 0;
    let marginPct = 0;
    let markupPct = 0;
    let profitPerUnit = 0;

    if (this.mode() === 'target-margin') {
      const m = Math.min(99.9, Math.max(0, Number(this.targetMargin()) || 0));
      finalPrice = cost / (1 - m / 100);
      profitPerUnit = finalPrice - cost;
      marginPct = m;
      markupPct = cost > 0 ? (profitPerUnit / cost) * 100 : 0;
    } else {
      finalPrice = Math.max(0, Number(this.sellingPriceInput()) || 0);
      profitPerUnit = finalPrice - cost;
      marginPct = finalPrice > 0 ? (profitPerUnit / finalPrice) * 100 : 0;
      markupPct = cost > 0 ? (profitPerUnit / cost) * 100 : 0;
    }

    const totalRevenue = finalPrice * qty;
    const totalCost = cost * qty;
    const totalProfit = profitPerUnit * qty;
    return { cogs: cost, sellingPrice: finalPrice, profitPerUnit, marginPct, markupPct, quantity: qty, totalRevenue, totalCost, totalProfit, isLoss: profitPerUnit < 0 };
  });

  constructor() {
    effect(() => {
      const res = this.results();
      this.updateChart(res.cogs, res.profitPerUnit);
    });
  }

  ngAfterViewInit(): void { this.initChart(); }
  ngOnDestroy(): void { this.chartInstance?.destroy(); this.chartInstance = null; }
  setMarginPreset(pct: number): void { this.mode.set('target-margin'); this.targetMargin.set(pct); }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const res = this.results();
    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: ['Selling Price Composition'], datasets: [
        { label: 'Cost of Goods (COGS)', data: [res.cogs], backgroundColor: '#f85149', borderColor: '#0d1117', borderWidth: 2 },
        { label: 'Gross Profit / Loss', data: [res.profitPerUnit], backgroundColor: '#00e676', borderColor: '#0d1117', borderWidth: 2 }
      ] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 }, callback: (val) => `$${Number(val).toFixed(2)}` } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#c9d1d9', font: { size: 12, weight: 'bold' } } } },
        plugins: { legend: { position: 'top', labels: { color: '#c9d1d9', font: { size: 12, weight: 'bold' } } }, tooltip: { backgroundColor: '#161b22', titleColor: '#ffffff', bodyColor: '#c9d1d9', borderColor: '#30363d', borderWidth: 1, callbacks: { label: (context) => ` ${context.dataset.label}: $${Number(context.raw).toFixed(2)}` } } }
      }
    });
  }

  private updateChart(cogs: number, profit: number): void {
    if (!this.chartInstance) return;
    this.chartInstance.data.datasets[0].data = [cogs];
    this.chartInstance.data.datasets[1].data = [profit];
    this.chartInstance.update('none');
  }
}
