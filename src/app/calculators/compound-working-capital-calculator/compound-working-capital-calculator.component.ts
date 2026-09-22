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
import { Title, Meta } from '@angular/platform-browser';
import { Chart, registerables } from 'chart.js';
import { CalculatorLayoutComponent, FintechCardComponent } from '../../shared/components';

Chart.register(...registerables);

interface CompoundPreset {
  name: string;
  initial: number;
  monthly: number;
  rate: number;
  years: number;
}

@Component({
  selector: 'app-compound-working-capital-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './compound-working-capital-calculator.component.html',
  styleUrl: './compound-working-capital-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompoundWorkingCapitalCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Compound Interest & Working Capital Calculator | Finance Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'Project future business treasury reserves and investment growth with compounding interest. Model monthly contributions and long-term capital appreciation.'
    });
  }

  readonly presets: CompoundPreset[] = [
    { name: 'Index Fund (S&P)', initial: 10000, monthly: 500, rate: 8.0, years: 10 },
    { name: 'High Yield Cash', initial: 50000, monthly: 2000, rate: 4.5, years: 5 },
    { name: 'Aggressive Growth', initial: 5000, monthly: 1000, rate: 12.0, years: 15 },
    { name: 'Stable Reserve', initial: 100000, monthly: 0, rate: 5.0, years: 20 },
  ];

  initialCapital = signal<number>(10000);
  monthlyContribution = signal<number>(500);
  annualRatePercent = signal<number>(8.0);
  years = signal<number>(10);

  results = computed(() => {
    const P = Math.max(0, this.initialCapital());
    const PMT = Math.max(0, this.monthlyContribution());
    const r = Math.max(0, this.annualRatePercent()) / 100 / 12;
    const n = Math.max(1, this.years()) * 12;

    // FV = P(1+r)^n + PMT * [((1+r)^n - 1) / r]
    let futureValue = 0;
    if (r === 0) {
      futureValue = P + PMT * n;
    } else {
      futureValue = P * Math.pow(1 + r, n) + PMT * ((Math.pow(1 + r, n) - 1) / r);
    }

    const totalContributions = P + PMT * n;
    const totalInterest = futureValue - totalContributions;

    // Generate yearly data for chart
    const yearlyData = [];
    for (let y = 0; y <= this.years(); y++) {
      const months = y * 12;
      let fv = 0;
      if (r === 0) {
        fv = P + PMT * months;
      } else {
        fv = P * Math.pow(1 + r, months) + PMT * ((Math.pow(1 + r, months) - 1) / r);
      }
      yearlyData.push({
        year: y,
        value: fv,
        contributions: P + PMT * months
      });
    }

    return {
      futureValue,
      totalContributions,
      totalInterest,
      yearlyData
    };
  });

  constructor() {
    effect(() => {
      this.updateChart();
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  setPreset(p: CompoundPreset): void {
    this.initialCapital.set(p.initial);
    this.monthlyContribution.set(p.monthly);
    this.annualRatePercent.set(p.rate);
    this.years.set(p.years);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: res.yearlyData.map(d => `Year ${d.year}`),
        datasets: [
          {
            label: 'Total Balance',
            data: res.yearlyData.map(d => d.value),
            borderColor: '#00e676',
            backgroundColor: 'rgba(0, 230, 118, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Total Contributions',
            data: res.yearlyData.map(d => d.contributions),
            borderColor: '#8b949e',
            borderDash: [5, 5],
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8b949e' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#8b949e' }
          }
        },
        plugins: {
          legend: { labels: { color: '#c9d1d9' } },
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;
    const res = this.results();
    this.chartInstance.data.labels = res.yearlyData.map(d => `Year ${d.year}`);
    this.chartInstance.data.datasets[0].data = res.yearlyData.map(d => d.value);
    this.chartInstance.data.datasets[1].data = res.yearlyData.map(d => d.contributions);
    this.chartInstance.update();
  }
}
