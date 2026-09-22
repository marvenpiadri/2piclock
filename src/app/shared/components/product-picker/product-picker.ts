import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-product-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-picker.html',
  styleUrl: './product-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductPickerComponent {
  private productService = inject(ProductService);
  private currencyService = inject(CurrencyService);

  currency = input<string>('USD');
  selectedCategory = signal<string>('All');
  searchQuery = signal<string>('');

  productSelected = output<Product>();

  readonly allProducts = this.productService.products;

  readonly categories = computed(() => {
    const list = this.allProducts();
    const set = new Set<string>();
    for (const p of list) {
      if (p.category) set.add(p.category);
    }
    return ['All', ...Array.from(set)];
  });

  readonly filteredProducts = computed(() => {
    const list = this.allProducts().filter(p => !p.isArchived);
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter(p => {
      const matchCat = cat === 'All' || p.category === cat;
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  });

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onPickProduct(product: Product): void {
    this.productSelected.emit(product);
  }

  formatPrice(amount: number): string {
    return this.currencyService.format(amount, this.currency());
  }
}
