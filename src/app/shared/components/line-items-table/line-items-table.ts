import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentLineItem, LineLayoutMode } from '../../../core/models/document.model';
import { CurrencyService } from '../../../core/services/currency.service';
import { CalculationService } from '../../../core/services/calculation.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-line-items-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './line-items-table.html',
  styleUrl: './line-items-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LineItemsTableComponent {
  private currencyService = inject(CurrencyService);
  private calculationService = inject(CalculationService);
  private productService = inject(ProductService);

  // Inputs
  items = input.required<DocumentLineItem[]>();
  lineLayoutMode = input<LineLayoutMode>('quantity');
  lockLineLayoutMode = input<boolean>(false);
  hasPricing = input<boolean>(true);
  currency = input<string>('USD');

  // Outputs
  itemsChange = output<DocumentLineItem[]>();
  lineLayoutModeChange = output<LineLayoutMode>();

  // Available products for quick dropdown
  readonly products = this.productService.products;

  currencySymbol = computed(() => this.currencyService.getSymbol(this.currency()));

  setMode(mode: LineLayoutMode): void {
    if (this.lockLineLayoutMode()) return;
    this.lineLayoutModeChange.emit(mode);
  }

  addItem(): void {
    const current = [...this.items()];
    const newItem: DocumentLineItem = {
      id: `item-${Date.now()}-${current.length + 1}`,
      description: '',
      quantity: 1,
      unitCost: 0,
      taxRate: 0,
      discountPercent: 0,
      amount: 0
    };
    this.itemsChange.emit([...current, newItem]);
  }

  removeItem(index: number): void {
    const current = [...this.items()];
    if (current.length <= 1) {
      // Clear line rather than remove last line
      current[0] = {
        ...current[0],
        description: '',
        quantity: 1,
        unitCost: 0,
        taxRate: 0,
        discountPercent: 0,
        amount: 0
      };
      this.itemsChange.emit(current);
      return;
    }
    current.splice(index, 1);
    this.itemsChange.emit(current);
  }

  onItemChange(index: number, field: keyof DocumentLineItem, value: any): void {
    const current = [...this.items()];
    const item = { ...current[index] };

    if (field === 'quantity') {
      item.quantity = Math.max(0, Number(value) || 0);
    } else if (field === 'unitCost') {
      item.unitCost = Math.max(0, Number(value) || 0);
    } else if (field === 'discountPercent') {
      item.discountPercent = Math.min(100, Math.max(0, Number(value) || 0));
    } else if (field === 'taxRate') {
      item.taxRate = Math.min(100, Math.max(0, Number(value) || 0));
    } else if (field === 'description') {
      item.description = String(value || '');
    }

    // Recalculate amount
    // In flatRate mode, quantity is 1 internally so unitCost * 1 = amount
    if (this.lineLayoutMode() === 'flatRate') {
      item.quantity = 1;
    }

    item.amount = this.calculationService.calculateLineAmount(
      item.unitCost,
      item.quantity,
      item.discountPercent
    );

    current[index] = item;
    this.itemsChange.emit(current);
  }

  selectProductForLine(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const productId = select.value;
    if (!productId) return;

    const prod = this.products().find(p => p.id === productId);
    if (!prod) return;

    const current = [...this.items()];
    const item = { ...current[index] };
    item.description = prod.name + (prod.description ? ` — ${prod.description}` : '');
    item.unitCost = prod.unitCost;
    item.taxRate = prod.taxRate;
    item.amount = this.calculationService.calculateLineAmount(item.unitCost, item.quantity, item.discountPercent);

    current[index] = item;
    this.itemsChange.emit(current);
    select.value = ''; // reset dropdown
  }
}
