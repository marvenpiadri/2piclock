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

@Component({
  selector: 'app-hourly-freelance-rate-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './hourly-freelance-rate-calculator.component.html',
  styleUrl: './hourly-freelance-rate-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HourlyFreelanceRateCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('breakdownDoughnut') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  // Inputs
  targetNetIncome = signal<number>(80000); // Target annual take-home
  taxRate = signal<number>(28); // Combined federal, state, self-employment tax %
  annualOverheads = signal<number>(12000); // Software, equipment, health insurance, accounting
  vacationSickWeeks = signal<number>(5); // Non-working weeks per year
  billableHoursPerWeek = signal<number>(25); // Real billable client hours/week (accounting for admin/pitching)
  profitBufferPercent = signal<number>(15); // Reinvestment / emergency business margin %

  // Computations
  workingWeeksPerYear = computed(() => {
    return Math.max(1, 52 - this.vacationSickWeeks());
  });

  annualBillableHours = computed(() => {
    return this.workingWeeksPerYear() * this.billableHoursPerWeek();
  });

  grossPreTaxIncome = computed(() => {
    const net = this.targetNetIncome();
    const tax = this.taxRate() / 100;
    if (tax >= 1) return net;
    return net / (1 - tax);
  });

  totalAnnualRevenueNeeded = computed(() => {
    const preTax = this.grossPreTaxIncome();
    const overheads = this.annualOverheads();
    const subtotal = preTax + overheads;
    const buffer = this.profitBufferPercent() / 100;
    return subtotal * (1 + buffer);
  });

  hourlyRate = computed(() => {
    const hours = this.annualBillableHours();
    if (hours <= 0) return 0;
    return Math.ceil(this.totalAnnualRevenueNeeded() / hours);
  });

  dayRate = computed(() => {
    return this.hourlyRate() * 8;
  });

  monthlyTargetGross = computed(() => {
    return this.totalAnnualRevenueNeeded() / 12;
  });

  copied = signal<boolean>(false);

  constructor() {
    effect(() => {
      const net = this.targetNetIncome();
      if (this.chartInstance && net > 0) {
        this.updateChart();
      }
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Hourly & Freelance Billing Rate Calculator — x-facture');
    this.metaService.updateTag({
      name: 'description',
      content: 'Calculate your sustainable freelance hourly and daily billing rates based on take-home income, tax reserves, overhead expenses, and billable capacity.',
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

  setPreset(type: 'senior-dev' | 'designer' | 'consultant' | 'agency'): void {
    switch (type) {
      case 'senior-dev':
        this.targetNetIncome.set(110000);
        this.taxRate.set(30);
        this.annualOverheads.set(15000);
        this.vacationSickWeeks.set(5);
        this.billableHoursPerWeek.set(25);
        this.profitBufferPercent.set(15);
        break;
      case 'designer':
        this.targetNetIncome.set(75000);
        this.taxRate.set(25);
        this.annualOverheads.set(10000);
        this.vacationSickWeeks.set(4);
        this.billableHoursPerWeek.set(28);
        this.profitBufferPercent.set(10);
        break;
      case 'consultant':
        this.targetNetIncome.set(140000);
        this.taxRate.set(32);
        this.annualOverheads.set(24000);
        this.vacationSickWeeks.set(6);
        this.billableHoursPerWeek.set(20);
        this.profitBufferPercent.set(20);
        break;
      case 'agency':
        this.targetNetIncome.set(200000);
        this.taxRate.set(35);
        this.annualOverheads.set(50000);
        this.vacationSickWeeks.set(4);
        this.billableHoursPerWeek.set(30);
        this.profitBufferPercent.set(25);
        break;
    }
  }

  copySummary(): void {
    const text = `Freelance Billing Rate Breakdown:
- Target Net Take-Home: $${this.targetNetIncome().toLocaleString()}/yr
- Required Annual Gross Revenue: $${this.totalAnnualRevenueNeeded().toFixed(0)}
- Annual Billable Hours: ${this.annualBillableHours()} hrs (${this.billableHoursPerWeek()} hrs/wk × ${this.workingWeeksPerYear()} wks)
- Minimum Hourly Rate: $${this.hourlyRate()}/hr
- Standard Day Rate (8 hrs): $${this.dayRate()}/day
- Monthly Gross Target: $${this.monthlyTargetGross().toFixed(0)}/mo`;

    navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  private initChart(): void {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const net = this.targetNetIncome();
    const tax = Math.max(0, this.grossPreTaxIncome() - net);
    const overheads = this.annualOverheads();
    const buffer = Math.max(0, this.totalAnnualRevenueNeeded() - (this.grossPreTaxIncome() + overheads));

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Net Take-Home', 'Taxes & SE Tax', 'Overheads & Expenses', 'Profit Reserve'],
        datasets: [
          {
            data: [net, tax, overheads, buffer],
            backgroundColor: ['#238636', '#dc2626', '#d97706', '#3b82f6'],
            borderWidth: 2,
            borderColor: '#161b22',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8b949e', font: { size: 11, weight: 'bold' }, padding: 8 },
          },
        },
      },
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;
    const net = this.targetNetIncome();
    const tax = Math.max(0, this.grossPreTaxIncome() - net);
    const overheads = this.annualOverheads();
    const buffer = Math.max(0, this.totalAnnualRevenueNeeded() - (this.grossPreTaxIncome() + overheads));

    this.chartInstance.data.datasets[0].data = [net, tax, overheads, buffer];
    this.chartInstance.update('none');
  }
}
