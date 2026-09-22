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

interface InventoryPreset {
  name: string;
  cogs: number;
  avgInventory: number;
  holdingRate: number;
}

@Component({
  selector: 'app-inventory-turnover-holding-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './inventory-turnover-holding-calculator.component.html',
  styleUrl: './inventory-turnover-holding-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryTurnoverHoldingCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('calcChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Inventory Turnover & Carrying Cost Calculator | Finance Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'Analyze inventory turnover ratio, days sales in inventory (DSI), and annual carrying costs. Optimize your warehouse and stock management.'
    });
  }

  readonly presets: InventoryPreset[] = [
    { name: 'Fast Fashion', cogs: 500000, avgInventory: 40000, holdingRate: 25 },
    { name: 'Grocery Store', cogs: 1200000, avgInventory: 80000, holdingRate: 30 },
    { name: 'Electronics', cogs: 800000, avgInventory: 150000, holdingRate: 20 },
    { name: 'Industrial Parts', cogs: 300000, avgInventory: 100000, holdingRate: 15 },
  ];

  cogs = signal<number>(450000);
  avgInventory = signal<number>(75000);
  holdingRatePercent = signal<number>(25);

  results = computed(() => {
    const cost = Math.max(0, this.cogs());
    const inv = Math.max(1, this.avgInventory());
    const rate = Math.max(0, this.holdingRatePercent()) / 100;

    const turnoverRatio = cost / inv;
    const dsi = turnoverRatio > 0 ? 365 / turnoverRatio : 0;
    const annualHoldingCost = inv * rate;

    // Split holding costs for visualization
    const capitalCost = annualHoldingCost * 0.6; // Opportunity cost
    const storageCost = annualHoldingCost * 0.2; // Warehouse
    const riskCost = annualHoldingCost * 0.15;   // Obsolescence/Theft
    const serviceCost = annualHoldingCost * 0.05; // Insurance/Tax

    return {
      turnoverRatio,
      dsi,
      annualHoldingCost,
      capitalCost,
      storageCost,
      riskCost,
      serviceCost
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

  setPreset(p: InventoryPreset): void {
    this.cogs.set(p.cogs);
    this.avgInventory.set(p.avgInventory);
    this.holdingRatePercent.set(p.holdingRate);
  }

  private initChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const res = this.results();

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Capital (Oppty)', 'Storage/Warehouse', 'Inventory Risk', 'Service Costs'],
        datasets: [
          {
            data: [res.capitalCost, res.storageCost, res.riskCost, res.serviceCost],
            backgroundColor: ['#00e676', '#33b3ae', '#f85149', '#8b949e'],
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
    this.chartInstance.data.datasets[0].data = [res.capitalCost, res.storageCost, res.riskCost, res.serviceCost];
    this.chartInstance.update();
  }
}
