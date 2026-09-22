import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { compressAndConvertToBase64 } from '../../../../core/utils/image-compression.util';

export const POPULAR_PRODUCT_ICONS = [
  { icon: 'inventory_2', label: 'Item / Box' },
  { icon: 'shopping_bag', label: 'Retail' },
  { icon: 'devices', label: 'Electronics' },
  { icon: 'engineering', label: 'Services' },
  { icon: 'design_services', label: 'Creative' },
  { icon: 'local_cafe', label: 'Food & Drink' },
  { icon: 'dns', label: 'Hosting & Tech' },
  { icon: 'receipt_long', label: 'Billing' },
  { icon: 'school', label: 'Training' },
  { icon: 'storefront', label: 'Store' },
  { icon: 'build', label: 'Maintenance' },
  { icon: 'subscriptions', label: 'Recurring' }
];

export const COMMON_CATEGORIES = [
  'General',
  'Services',
  'Retail',
  'Consulting',
  'Digital',
  'Hardware',
  'Beverages',
  'Subscriptions'
];

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product-modal.html',
  styleUrl: './add-product-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddProductModalComponent implements OnInit {
  private productService = inject(ProductService);
  private currencyService = inject(CurrencyService);

  readonly product = input<Product | null>(null);
  readonly isOpen = input<boolean>(true);

  readonly saved = output<Product>();
  readonly cancelled = output<void>();

  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly iconsList = POPULAR_PRODUCT_ICONS;
  readonly categoryPresets = COMMON_CATEGORIES;

  // Form State Signals
  name = signal<string>('');
  sku = signal<string>('');
  category = signal<string>('General');
  unitCost = signal<number>(0);
  taxRate = signal<number>(0);
  description = signal<string>('');
  icon = signal<string>('inventory_2');
  imageUrl = signal<string | undefined>(undefined);

  // Upload & UI Status
  isCompressing = signal<boolean>(false);
  imageStats = signal<{ sizeKb: number; width: number; height: number } | null>(null);
  isDragging = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const existing = this.product();
    if (existing) {
      this.name.set(existing.name || '');
      this.sku.set(existing.sku || '');
      this.category.set(existing.category || 'General');
      this.unitCost.set(existing.unitCost || 0);
      this.taxRate.set(existing.taxRate || 0);
      this.description.set(existing.description || '');
      this.icon.set(existing.icon || 'inventory_2');
      this.imageUrl.set(existing.imageUrl);
      if (existing.imageUrl) {
        this.imageStats.set({ sizeKb: Math.round((existing.imageUrl.length * 0.75) / 1024), width: 0, height: 0 });
      }
    } else {
      this.autoGenerateSku();
    }
  }

  formatCurrency(amount: number): string {
    return this.currencyService.format(amount);
  }

  getGrossPrice(): number {
    const cost = this.unitCost();
    const rate = this.taxRate();
    return cost + (cost * rate) / 100;
  }

  setTaxPreset(rate: number): void {
    this.taxRate.set(rate);
  }

  setCategoryPreset(cat: string): void {
    this.category.set(cat);
  }

  setIcon(ico: string): void {
    this.icon.set(ico);
  }

  autoGenerateSku(): void {
    const prefix = (this.category() || 'PROD').substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    this.sku.set(`${prefix}-${random}`);
  }

  triggerFileInput(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      await this.processImageFile(files[0]);
    }
    // Reset file input value to allow re-uploading same file name if needed
    if (target) {
      target.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await this.processImageFile(file);
      } else {
        this.errorMessage.set('Please drop a valid image file (PNG, JPG, WebP, etc.)');
      }
    }
  }

  async processImageFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selected file is not an image');
      return;
    }

    this.errorMessage.set(null);
    this.isCompressing.set(true);

    try {
      // Compress to max 480x480 with 0.8 quality JPEG
      const result = await compressAndConvertToBase64(file, {
        maxWidth: 480,
        maxHeight: 480,
        quality: 0.8,
        mimeType: 'image/jpeg'
      });

      this.imageUrl.set(result.base64);
      this.imageStats.set({
        sizeKb: result.sizeKb,
        width: result.width,
        height: result.height
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing image';
      this.errorMessage.set(msg);
    } finally {
      this.isCompressing.set(false);
    }
  }

  removeImage(): void {
    this.imageUrl.set(undefined);
    this.imageStats.set(null);
  }

  async onSubmit(): Promise<void> {
    const trimmedName = this.name().trim();
    if (!trimmedName) {
      this.errorMessage.set('Product name is required');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const existing = this.product();
      const productData: Partial<Product> = {
        id: existing?.id,
        name: trimmedName,
        sku: this.sku().trim(),
        category: this.category().trim() || 'General',
        unitCost: Number(this.unitCost()) || 0,
        taxRate: Number(this.taxRate()) || 0,
        description: this.description().trim(),
        icon: this.icon() || 'inventory_2',
        imageUrl: this.imageUrl(),
        createdAt: existing?.createdAt
      };

      const savedProd = await this.productService.saveProduct(productData);
      this.saved.emit(savedProd);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving product';
      this.errorMessage.set(msg);
      this.isSaving.set(false);
    }
  }

  onClose(): void {
    this.cancelled.emit();
  }
}
