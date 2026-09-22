import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { Product } from '../../../../core/models/product.model';
import { AddProductModalComponent } from '../../components/add-product-modal/add-product-modal';

@Component({
  selector: 'app-products-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AddProductModalComponent],
  templateUrl: './products-hub.html',
  styleUrl: './products-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsHubPage {
  private productService = inject(ProductService);
  private currencyService = inject(CurrencyService);

  readonly products = this.productService.products;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  showModal = signal<boolean>(false);
  activeProduct = signal<Product | null>(null);

  categories = computed(() => {
    const cats = new Set<string>();
    this.products().forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  });

  filteredProducts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.products().filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (q) {
        return p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q));
      }
      return true;
    });
  });

  formatCurrency(val: number): string {
    return this.currencyService.format(val);
  }

  openAddModal(): void {
    this.activeProduct.set(null);
    this.showModal.set(true);
  }

  openEditModal(p: Product, event: Event): void {
    event.stopPropagation();
    this.activeProduct.set({ ...p });
    this.showModal.set(true);
  }

  onProductSaved(_saved: Product): void {
    this.showModal.set(false);
    this.activeProduct.set(null);
  }

  onModalCancelled(): void {
    this.showModal.set(false);
    this.activeProduct.set(null);
  }

  async deleteProduct(p: Product, event: Event): Promise<void> {
    event.stopPropagation();
    if (confirm(`Delete product "${p.name}"?`)) {
      await this.productService.deleteProduct(p.id);
    }
  }
}
