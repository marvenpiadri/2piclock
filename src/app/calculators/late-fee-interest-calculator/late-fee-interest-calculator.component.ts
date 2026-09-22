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
import { CalculatorLayoutComponent } from '../../shared/components/calculator-layout/calculator-layout';

Chart.register(...registerables);

@Component({
  selector: 'app-late-fee-interest-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent],
  templateUrl: './late-fee-interest-calculator.component.html',
  styleUrl: './late-fee-interest-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateFeeInterestCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Late Fee & Overdue Interest Calculator | Commercial Debt Penalty Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'Calculate overdue interest, statutory daily late fees, and total debt due on unpaid commercial business invoices.'
    });
    this.metaService.updateTag({
      name: 'keywords',
      content: 'late fee calculator, invoice overdue interest, late payment penalty calculator, statutory interest calculator, commercial debt recovery'
    });
  }

  // Primary Inputs
  invoicePrincipal = signal<number>(5000);
  daysPastDue = signal<number>(45);
  gracePeriodDays = signal<number>(10);
  annualInterestRate = signal<number>(18); // % APR
  flatLateFee = signal<number>(50); // One-off administrative fee

  // Computations
  results = computed(() => {
    const principal = Math.max(0, this.invoicePrincipal());
    const totalDays = Math.max(0, this.daysPastDue());
    const grace = Math.max(0, this.gracePeriodDays());
    const apr = Math.max(0, this.annualInterestRate());
    const flatFee = Math.max(0, this.flatLateFee());

    const billableOverdueDays = Math.max(0, totalDays - grace);
    const dailyInterestRate = apr / 100 / 365;

    // Compounded daily: P * ((1 + r)^n - 1)
    let interestPenalty = 0;
    if (billableOverdueDays > 0 && dailyInterestRate > 0) {
      interestPenalty = principal * (Math.pow(1 + dailyInterestRate, billableOverdueDays) - 1);
    }

    const appliedFlatFee = totalDays > grace ? flatFee : 0;
    const totalLatePenalties = interestPenalty + appliedFlatFee;
    const grandTotalDue = principal + totalLatePenalties;

    // Projections for 30, 60, and 90 days past due
    const calculatePenaltyForDays = (days: number) => {
      const billable = Math.max(0, days - grace);
      const interest = billable > 0 ? principal * (Math.pow(1 + dailyInterestRate, billable) - 1) : 0;
      const flat = days > grace ? flatFee : 0;
      return interest + flat;
    };

    const penalty30 = calculatePenaltyForDays(30);
    const penalty60 = calculatePenaltyForDays(60);
    const penalty90 = calculatePenaltyForDays(90);

    return {
      principal,
      totalDays,
      grace,
      billableOverdueDays,
      dailyRatePercent: dailyInterestRate * 100,
      interestPenalty,
      appliedFlatFee,
      totalLatePenalties,
      grandTotalDue,
      penalty30,
      penalty60,
      penalty90,
    };
  });

  constructor() {
    effect(() => {
      const res = this.results();
      this.updateChart(res.principal, res.penalty30, res.penalty60, res.penalty90);
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  setPresetDays(days: number): void {
    this.daysPastDue.set(days);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['30 Days Overdue', '60 Days Overdue', '90 Days Overdue'],
        datasets: [
          {
            label: 'Original Principal',
            data: [res.principal, res.principal, res.principal],
            backgroundColor: '#21262d',
            borderColor: '#30363d',
            borderWidth: 1,
          },
          {
            label: 'Accrued Late Penalties & Interest',
            data: [res.penalty30, res.penalty60, res.penalty90],
            backgroundColor: '#f85149',
            borderColor: '#f85149',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { color: '#21262d' },
            ticks: { color: '#8b949e', font: { size: 11, weight: 'bold' } },
          },
          y: {
            stacked: true,
            grid: { color: '#21262d' },
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (val) => `$${Number(val).toLocaleString()}`,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#c9d1d9', font: { size: 12, weight: 'bold' } },
          },
          tooltip: {
            backgroundColor: '#161b22',
            titleColor: '#ffffff',
            bodyColor: '#c9d1d9',
            borderColor: '#30363d',
            borderWidth: 1,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: $${Number(context.raw).toFixed(2)}`,
            },
          },
        },
      },
    });
  }

  private updateChart(p: number, p30: number, p60: number, p90: number): void {
    if (!this.chartInstance) return;
    this.chartInstance.data.datasets[0].data = [p, p, p];
    this.chartInstance.data.datasets[1].data = [p30, p60, p90];
    this.chartInstance.update();
  }
}
