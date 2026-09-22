import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from '../../core/services/seo.service';
import { CalculatorLayoutComponent, FintechCardComponent } from '../../shared/components';

interface Denomination {
  name: string;
  value: number;
  type: 'note' | 'coin';
  count: number;
}

@Component({
  selector: 'app-cash-register-change-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CalculatorLayoutComponent, FintechCardComponent],
  templateUrl: './cash-register-change-calculator.component.html',
  styleUrl: './cash-register-change-calculator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterChangeCalculatorComponent implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateMetadata({
      title: 'Cash Register Change & Denominations Calculator | POS Efficiency Pro',
      description: 'Calculate exact cash change and the optimal mix of banknotes and coins to hand back to customers. Perfect for retail POS and cashier training.',
      keywords: 'cash change calculator, denomination counter, pos change calculator, retail cash register tool, cashier training tool'
    });

    this.seoService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Cash Register Change Calculator",
      "url": "https://ais-pre-7or4nnyzenrdo3iukkuhfv-534075635055.europe-west3.run.app/calculators/cash-register-change-calculator",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "description": "Retail point-of-sale cash change and denomination calculator.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    });
  }

  saleTotal = signal<number>(36.42);
  amountTendered = signal<number>(50.00);

  results = computed(() => {
    const sale = Math.max(0, this.saleTotal());
    const tendered = Math.max(0, this.amountTendered());
    const totalChange = Math.max(0, tendered - sale);

    // Calculate denominations
    let remaining = Math.round(totalChange * 100);
    
    const denominations: Denomination[] = [
      { name: '$100 Bill', value: 10000, type: 'note', count: 0 },
      { name: '$50 Bill', value: 5000, type: 'note', count: 0 },
      { name: '$20 Bill', value: 2000, type: 'note', count: 0 },
      { name: '$10 Bill', value: 1000, type: 'note', count: 0 },
      { name: '$5 Bill', value: 500, type: 'note', count: 0 },
      { name: '$1 Bill', value: 100, type: 'note', count: 0 },
      { name: 'Quarter (25¢)', value: 25, type: 'coin', count: 0 },
      { name: 'Dime (10¢)', value: 10, type: 'coin', count: 0 },
      { name: 'Nickel (5¢)', value: 5, type: 'coin', count: 0 },
      { name: 'Penny (1¢)', value: 1, type: 'coin', count: 0 },
    ];

    denominations.forEach(d => {
      d.count = Math.floor(remaining / d.value);
      remaining %= d.value;
    });

    return {
      totalChange,
      denominations: denominations.filter(d => d.count > 0),
      isShort: tendered < sale
    };
  });

  setTendered(amt: number): void {
    this.amountTendered.set(amt);
  }
}
