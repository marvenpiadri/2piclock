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
import { SeoService } from '../../core/services/seo.service';
import { Chart, registerables } from 'chart.js';
import { CalculatorLayoutComponent, FintechCardComponent } from '../../shared/components';

Chart.register(...registerables);

interface TaxPreset {
  country: string;
  rate: number;
  label: string;
}

@Component({
  selector: 'app-sales-tax-vat-splitter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './sales-tax-vat-splitter.component.html',
  styleUrl: './sales-tax-vat-splitter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesTaxVatSplitterComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private seoService = inject(SeoService);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.seoService.updateMetadata({
      title: 'Sales Tax & VAT Reverse Splitter | Inclusive & Exclusive Tax Pro',
      description: 'Calculate inclusive and exclusive sales tax, VAT, and GST. Extract pre-tax net values from gross receipts or add tax to net totals instantly with global presets.',
      keywords: 'vat calculator, sales tax splitter, reverse tax calculator, extract vat from total, inclusive vs exclusive tax calculator, gst calculator'
    });

    this.seoService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Sales Tax & VAT Splitter",
      "url": "https://ais-pre-7or4nnyzenrdo3iukkuhfv-534075635055.europe-west3.run.app/calculators/sales-tax-vat-splitter",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "All",
      "description": "Professional tax extraction and addition tool for global commerce.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    });
  }

  // Tax Presets
  readonly taxPresets: TaxPreset[] = [
    { country: 'United States (Avg)', rate: 7.25, label: 'US State Sales Tax' },
    { country: 'United Kingdom', rate: 20.0, label: 'UK Standard VAT' },
    { country: 'Germany / EU', rate: 19.0, label: 'EU Standard MwSt' },
    { country: 'Canada (HST)', rate: 13.0, label: 'Canada HST Average' },
    { country: 'Australia / NZ', rate: 10.0, label: 'AU / NZ GST' },
    { country: 'France', rate: 20.0, label: 'French TVA' },
    { country: 'UAE / GCC', rate: 5.0, label: 'GCC VAT' },
  ];

  // Mode: 'extract' (Inclusive: total already has tax, extract base vs tax)
  // vs 'add' (Exclusive: net amount given, add tax to find grand total)
  taxMode = signal<'extract' | 'add'>('extract');

  // Primary Inputs
  inputAmount = signal<number>(1200);
  taxRatePercent = signal<number>(20);

  // Computations
  results = computed(() => {
    const rawAmount = Math.max(0, this.inputAmount());
    const rate = Math.max(0, this.taxRatePercent());
    const rateFactor = rate / 100;

    let netBase = 0;
    let taxAmount = 0;
    let grossTotal = 0;

    if (this.taxMode() === 'extract') {
      // Inclusive: Input is Gross
      grossTotal = rawAmount;
      netBase = grossTotal / (1 + rateFactor);
      taxAmount = grossTotal - netBase;
    } else {
      // Exclusive: Input is Net
      netBase = rawAmount;
      taxAmount = netBase * rateFactor;
      grossTotal = netBase + taxAmount;
    }

    const taxPortionPercentage = grossTotal > 0 ? (taxAmount / grossTotal) * 100 : 0;

    return {
      netBase,
      taxAmount,
      grossTotal,
      taxRate: rate,
      taxPortionPercentage,
    };
  });

  constructor() {
    effect(() => {
      const res = this.results();
      this.updateChart(res.netBase, res.taxAmount);
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

  setRatePreset(rate: number): void {
    this.taxRatePercent.set(rate);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Net Pre-Tax Base', 'Government Tax Allocation'],
        datasets: [
          {
            data: [res.netBase, res.taxAmount],
            backgroundColor: ['#00e676', '#f85149'],
            borderColor: ['#0d1117', '#0d1117'],
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#c9d1d9',
              font: { size: 12, weight: 'bold' },
              padding: 16,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: '#161b22',
            titleColor: '#ffffff',
            bodyColor: '#c9d1d9',
            borderColor: '#30363d',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = Number(context.raw) || 0;
                return ` ${context.label}: $${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              },
            },
          },
        },
      },
    });
  }

  private updateChart(net: number, tax: number): void {
    if (!this.chartInstance) return;
    this.chartInstance.data.datasets[0].data = [net, tax];
    this.chartInstance.update();
  }
}
