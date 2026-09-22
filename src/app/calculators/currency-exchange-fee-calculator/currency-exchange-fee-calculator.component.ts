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

interface ExchangePreset {
  name: string;
  amount: number;
  realRate: number;
  offeredRate: number;
  fee: number;
}

@Component({
  selector: 'app-currency-exchange-fee-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './currency-exchange-fee-calculator.component.html',
  styleUrl: './currency-exchange-fee-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyExchangeFeeCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Currency Exchange Fee & FX Spread Calculator | Finance Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'Calculate hidden currency exchange markups, bank wire fees, and FX spreads. Compare real mid-market rates against bank offered rates.'
    });
  }

  readonly presets: ExchangePreset[] = [
    { name: 'Typical Bank (3%)', amount: 5000, realRate: 1.10, offeredRate: 1.067, fee: 25 },
    { name: 'Wire Transfer', amount: 10000, realRate: 0.92, offeredRate: 0.895, fee: 45 },
    { name: 'Wise / Revolut', amount: 2500, realRate: 1.10, offeredRate: 1.098, fee: 12 },
    { name: 'Airport Kiosk', amount: 500, realRate: 1.10, offeredRate: 1.01, fee: 0 },
  ];

  transferAmount = signal<number>(5000);
  midMarketRate = signal<number>(1.10);
  offeredRate = signal<number>(1.067);
  fixedFees = signal<number>(25);

  results = computed(() => {
    const amt = Math.max(0, this.transferAmount());
    const real = Math.max(0.00001, this.midMarketRate());
    const offered = Math.max(0, this.offeredRate());
    const fees = Math.max(0, this.fixedFees());

    const realValue = amt * real;
    const receivedValue = amt * offered;
    
    // Total hidden cost = Real Value - (Received Value - Fees)
    const markupCost = realValue - receivedValue;
    const totalCost = markupCost + fees;
    const netReceived = receivedValue - fees;
    
    const markupPercent = real > 0 ? ((real - offered) / real) * 100 : 0;
    const effectiveFeePercent = realValue > 0 ? (totalCost / realValue) * 100 : 0;

    return {
      realValue,
      receivedValue,
      markupCost,
      totalCost,
      netReceived,
      markupPercent,
      effectiveFeePercent
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

  setPreset(p: ExchangePreset): void {
    this.transferAmount.set(p.amount);
    this.midMarketRate.set(p.realRate);
    this.offeredRate.set(p.offeredRate);
    this.fixedFees.set(p.fee);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Net Received', 'Hidden FX Markup', 'Bank/Wire Fees'],
        datasets: [
          {
            data: [res.netReceived, res.markupCost, this.fixedFees()],
            backgroundColor: ['#00e676', '#f85149', '#30363d'],
            borderColor: '#0d1117',
            borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#c9d1d9', usePointStyle: true } },
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;
    const res = this.results();
    this.chartInstance.data.datasets[0].data = [res.netReceived, res.markupCost, this.fixedFees()];
    this.chartInstance.update();
  }
}
