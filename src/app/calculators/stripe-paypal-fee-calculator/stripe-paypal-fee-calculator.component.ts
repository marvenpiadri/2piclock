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

interface FeeTier {
  id: string;
  name: string;
  percent: number;
  fixed: number;
  provider: 'Stripe' | 'PayPal' | 'Custom';
  description: string;
}

@Component({
  selector: 'app-stripe-paypal-fee-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent, FintechInputComponent],
  templateUrl: './stripe-paypal-fee-calculator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StripePaypalFeeCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly seoService = inject(SeoService);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.seoService.updateCalculatorMetadata({
      slug: 'stripe-paypal-fee-calculator',
      name: 'Stripe & PayPal Merchant Fee Calculator',
      category: 'payments',
      title: 'Stripe & PayPal Fee Calculator (2026) | Merchant Fee Calculator',
      description: 'Calculate payment processing fees, net payouts, effective rates, and the gross amount needed to cover Stripe or PayPal transaction fees.',
      keywords: ['stripe fee calculator', 'paypal fee calculator', 'merchant fee calculator', 'payment processing fee calculator', 'credit card processing fee calculator', 'payment gateway fee calculator', 'transaction fee calculator', 'invoice surcharge calculator']
    });
  }

  readonly feePresets: FeeTier[] = [
    { id: 'stripe-us', name: 'Stripe US Standard', percent: 2.9, fixed: 0.30, provider: 'Stripe', description: '2.9% + $0.30 (Domestic Cards)' },
    { id: 'stripe-intl', name: 'Stripe International', percent: 3.9, fixed: 0.30, provider: 'Stripe', description: '3.9% + $0.30 (Cross-border + FX)' },
    { id: 'stripe-ach', name: 'Stripe ACH Direct Debit', percent: 0.8, fixed: 0.00, provider: 'Stripe', description: '0.8% (Capped at $5.00)' },
    { id: 'paypal-us', name: 'PayPal Commerce US', percent: 3.49, fixed: 0.49, provider: 'PayPal', description: '3.49% + $0.49 (Standard Checkout)' },
    { id: 'paypal-qr', name: 'PayPal In-Person QR', percent: 1.9, fixed: 0.10, provider: 'PayPal', description: '1.90% + $0.10 (QR Transactions > $10)' },
    { id: 'paypal-intl', name: 'PayPal International', percent: 4.99, fixed: 0.49, provider: 'PayPal', description: '4.99% + $0.49 (Cross-border)' },
    { id: 'custom', name: 'Custom Gateway Rate', percent: 2.5, fixed: 0.25, provider: 'Custom', description: 'Custom negotiable processing fee' },
  ];

  calcMode = signal<'from-gross' | 'to-net'>('from-gross');
  selectedPresetId = signal<string>('stripe-us');
  feePercent = signal<number>(2.9);
  feeFixed = signal<number>(0.30);
  inputAmount = signal<number>(1000);

  activePreset = computed(() => this.feePresets.find(p => p.id === this.selectedPresetId()) ?? this.feePresets[0]);

  private applyFeeCap(gross: number, percentage: number, fixed: number): number {
    const rawFee = gross * percentage / 100 + fixed;
    return this.selectedPresetId() === 'stripe-ach' ? Math.min(rawFee, 5) : rawFee;
  }

  fromGrossResults = computed(() => {
    const gross = Math.max(0, Number(this.inputAmount()) || 0);
    const pct = Math.max(0, Number(this.feePercent()) || 0);
    const fixed = Math.max(0, Number(this.feeFixed()) || 0);
    const totalFee = Math.min(this.applyFeeCap(gross, pct, fixed), gross);
    const percentageFee = Math.max(0, totalFee - Math.min(fixed, totalFee));
    const net = Math.max(0, gross - totalFee);
    const effectiveRate = gross > 0 ? (totalFee / gross) * 100 : 0;
    return { gross, percentageFee, fixedFee: Math.min(fixed, totalFee), totalFee, netPayout: net, effectiveRate };
  });

  toNetResults = computed(() => {
    const targetNet = Math.max(0, Number(this.inputAmount()) || 0);
    const pct = Math.max(0, Number(this.feePercent()) || 0);
    const fixed = Math.max(0, Number(this.feeFixed()) || 0);
    const rateDecimal = pct / 100;
    const cap = this.selectedPresetId() === 'stripe-ach' ? 5 : null;

    let requiredGross = rateDecimal < 1 ? (targetNet + fixed) / (1 - rateDecimal) : targetNet + fixed;
    let totalFee = requiredGross - targetNet;

    if (cap !== null && totalFee > cap) {
      requiredGross = targetNet + cap;
      totalFee = cap;
    }

    const percentageFee = Math.max(0, totalFee - Math.min(fixed, totalFee));
    const effectiveRate = requiredGross > 0 ? (totalFee / requiredGross) * 100 : 0;
    return { requiredGross, targetNet, totalFee, percentageFee, fixedFee: Math.min(fixed, totalFee), effectiveRate };
  });

  displayMetrics = computed(() => {
    if (this.calcMode() === 'from-gross') {
      const res = this.fromGrossResults();
      return { gross: res.gross, fee: res.totalFee, net: res.netPayout, effectiveRate: res.effectiveRate, labelMain: 'Net Payout Received', labelSub: 'Amount reaching your bank account' };
    }
    const res = this.toNetResults();
    return { gross: res.requiredGross, fee: res.totalFee, net: res.targetNet, effectiveRate: res.effectiveRate, labelMain: 'Required Invoice Total', labelSub: 'Amount to bill client to net target' };
  });

  constructor() {
    effect(() => {
      const metrics = this.displayMetrics();
      this.updateChart(metrics.net, metrics.fee);
    });
  }

  ngAfterViewInit(): void { this.initChart(); }
  ngOnDestroy(): void { this.chartInstance?.destroy(); this.chartInstance = null; }

  onSelectPreset(presetId: string): void {
    this.selectedPresetId.set(presetId);
    const preset = this.feePresets.find(item => item.id === presetId);
    if (preset) {
      this.feePercent.set(preset.percent);
      this.feeFixed.set(preset.fixed);
    }
  }

  setAmountPreset(amount: number): void { this.inputAmount.set(amount); }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const metrics = this.displayMetrics();
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Net Revenue Kept', 'Processor Fees'],
        datasets: [{
          data: [metrics.net, metrics.fee],
          backgroundColor: ['#188038', '#dc2626'],
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20, 24, 22, 0.96)',
            titleColor: '#ffffff',
            bodyColor: '#d9e0dc',
            borderWidth: 0,
            padding: 10,
            callbacks: {
              label: (context) => ` ${context.label}: $${(Number(context.raw) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        }
      }
    });
  }

  private updateChart(net: number, fee: number): void {
    if (!this.chartInstance) return;
    this.chartInstance.data.datasets[0].data = [net, fee];
    this.chartInstance.update('none');
  }
}
