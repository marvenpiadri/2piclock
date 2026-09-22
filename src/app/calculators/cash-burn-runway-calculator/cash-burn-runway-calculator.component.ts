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
import { CalculatorLayoutComponent, FintechCardComponent, FintechInputComponent } from '../../shared/components';

Chart.register(...registerables);

@Component({
  selector: 'app-cash-burn-runway-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent, FintechInputComponent],
  templateUrl: './cash-burn-runway-calculator.component.html',
  styleUrl: './cash-burn-runway-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashBurnRunwayCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private seoService = inject(SeoService);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.seoService.updateMetadata({
      title: 'Cash Burn Rate & Runway Calculator | X-Facture',
      description: 'Calculate monthly burn rate, cash runway, projected cash balance, revenue growth and estimated zero-cash date for a business or startup.',
      keywords: 'cash burn calculator, startup runway calculator, net burn rate calculator, cash runway, startup financial calculator',
      url: 'https://x-facture.com/calculators/cash-burn-runway-calculator'
    });

    this.seoService.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Cash Burn & Runway Calculator',
      url: 'https://x-facture.com/calculators/cash-burn-runway-calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      isAccessibleForFree: true,
      description: 'Business and startup cash burn, runway and cash projection calculator.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    });
  }

  startingCash = signal<number>(150000);
  monthlyRevenue = signal<number>(22000);
  monthlyExpenses = signal<number>(38000);
  revenueGrowthRate = signal<number>(3);

  grossBurnRate = computed(() => Math.max(0, this.monthlyExpenses()));

  netBurnRate = computed(() => Math.max(0, this.monthlyExpenses() - this.monthlyRevenue()));

  isCashFlowPositive = computed(() => this.monthlyRevenue() >= this.monthlyExpenses());

  /** Simulates month-end cash using the same convention as the 12-month projection. */
  runwayMonths = computed<number | null>(() => {
    const startingCash = Math.max(0, this.startingCash());
    let currentRev = Math.max(0, this.monthlyRevenue());
    const expenses = Math.max(0, this.monthlyExpenses());
    const growth = this.revenueGrowthRate() / 100;

    if (startingCash <= 0) return 0;

    let runningCash = startingCash;

    // A 100-year horizon prevents an unbounded loop while avoiding the old
    // 120-month result that could be mistaken for an actual runway value.
    for (let month = 1; month <= 1200; month++) {
      currentRev *= 1 + growth;
      const netCashFlow = currentRev - expenses;

      if (netCashFlow >= 0) return Infinity;

      const monthlyBurn = -netCashFlow;
      if (runningCash <= monthlyBurn) {
        const fraction = runningCash / monthlyBurn;
        return Math.max(0, Math.round((month - 1 + fraction) * 10) / 10);
      }

      runningCash -= monthlyBurn;
    }

    return Infinity;
  });

  zeroCashDate = computed(() => {
    const months = this.runwayMonths();
    if (months === null) return 'No cash available';
    if (months === Infinity) return 'N/A (Cash Flow Positive)';

    const date = new Date();
    const wholeMonths = Math.floor(months);
    date.setMonth(date.getMonth() + wholeMonths);
    const dayFraction = months - wholeMonths;
    if (dayFraction > 0) date.setDate(date.getDate() + Math.round(dayFraction * 30));

    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  });

  projectionData = computed(() => {
    const startingCash = Math.max(0, this.startingCash());
    let currentRev = Math.max(0, this.monthlyRevenue());
    const expenses = Math.max(0, this.monthlyExpenses());
    const growth = this.revenueGrowthRate() / 100;

    const labels: string[] = ['Current'];
    const cashPoints: number[] = [Math.round(startingCash)];
    const revenuePoints: number[] = [Math.round(currentRev)];
    const expensePoints: number[] = [Math.round(expenses)];

    let runningCash = startingCash;

    for (let month = 1; month <= 12; month++) {
      labels.push(`M+${month}`);
      currentRev *= 1 + growth;
      runningCash = Math.max(0, runningCash + currentRev - expenses);

      cashPoints.push(Math.round(runningCash));
      revenuePoints.push(Math.round(currentRev));
      expensePoints.push(Math.round(expenses));
    }

    return { labels, cashPoints, revenuePoints, expensePoints };
  });

  constructor() {
    effect(() => {
      const projection = this.projectionData();
      this.updateChart(projection.labels, projection.cashPoints);
    });
  }

  ngAfterViewInit(): void { this.initChart(); }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
    this.chartInstance = null;
  }

  setScenario(cash: number, rev: number, exp: number, growth = 0): void {
    this.startingCash.set(cash);
    this.monthlyRevenue.set(rev);
    this.monthlyExpenses.set(exp);
    this.revenueGrowthRate.set(growth);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const projection = this.projectionData();

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: projection.labels,
        datasets: [{
          label: 'Projected Cash Reserve ($)',
          data: projection.cashPoints,
          borderColor: '#00e676',
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#00e676',
          pointBorderColor: '#0d1117',
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 11 } } },
          y: {
            grid: { color: '#21262d' },
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (value) => `$${Number(value).toLocaleString()}`,
            },
          },
        },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#c9d1d9', font: { size: 12, weight: 'bold' } } },
          tooltip: {
            backgroundColor: '#161b22', titleColor: '#ffffff', bodyColor: '#c9d1d9',
            borderColor: '#30363d', borderWidth: 1,
            callbacks: { label: (context) => ` Cash Balance: $${Number(context.raw).toLocaleString()}` },
          },
        },
      },
    });
  }

  private updateChart(labels: string[], cashPoints: number[]): void {
    if (!this.chartInstance) return;
    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets[0].data = cashPoints;
    this.chartInstance.update();
  }
}
