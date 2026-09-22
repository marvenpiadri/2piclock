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

interface LoanPreset {
  name: string;
  amount: number;
  rate: number;
  term: number;
}

@Component({
  selector: 'app-commercial-loan-emi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './commercial-loan-emi-calculator.component.html',
  styleUrl: './commercial-loan-emi-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommercialLoanEmiCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Commercial Loan & Equipment EMI Calculator | Finance Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'Calculate monthly EMI for commercial loans and equipment financing. View total interest costs and amortization split.'
    });
  }

  readonly presets: LoanPreset[] = [
    { name: 'SBA 7(a) Loan', amount: 250000, rate: 7.5, term: 10 },
    { name: 'Equipment Lease', amount: 50000, rate: 8.0, term: 5 },
    { name: 'Working Capital', amount: 100000, rate: 6.5, term: 3 },
    { name: 'Commercial Real Estate', amount: 1000000, rate: 5.5, term: 20 },
  ];

  loanAmount = signal<number>(150000);
  interestRate = signal<number>(7.0);
  loanTermYears = signal<number>(5);

  results = computed(() => {
    const P = Math.max(0, this.loanAmount());
    const r = Math.max(0, this.interestRate()) / 12 / 100;
    const n = Math.max(1, this.loanTermYears()) * 12;

    let emi = 0;
    if (r === 0) {
      emi = P / n;
    } else {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;
    const interestToPrincipalRatio = P > 0 ? (totalInterest / P) * 100 : 0;

    return {
      emi,
      totalPayment,
      totalInterest,
      principal: P,
      interestToPrincipalRatio,
      termMonths: n
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

  setPreset(p: LoanPreset): void {
    this.loanAmount.set(p.amount);
    this.interestRate.set(p.rate);
    this.loanTermYears.set(p.term);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal Amount', 'Total Interest Cost'],
        datasets: [
          {
            data: [res.principal, res.totalInterest],
            backgroundColor: ['#00e676', '#f85149'],
            borderColor: '#0d1117',
            borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#c9d1d9' } },
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;
    const res = this.results();
    this.chartInstance.data.datasets[0].data = [res.principal, res.totalInterest];
    this.chartInstance.update();
  }
}
