import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PosService } from '../../../../core/services/pos.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { Product } from '../../../../core/models/product.model';
import { PosPaymentRecord, RegisterReport } from '../../../../core/models/pos.model';
import { ProductPickerComponent } from '../../../../shared/components/product-picker/product-picker';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductPickerComponent],
  templateUrl: './pos-terminal.html',
  styleUrl: './pos-terminal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosTerminalPage {
  private posService = inject(PosService);
  private currencyService = inject(CurrencyService);
  private router = inject(Router);

  readonly currentSession = this.posService.currentSession;
  readonly cart = this.posService.cart;
  readonly currentDiscount = this.posService.currentDiscount;
  readonly currentNote = this.posService.currentNote;

  // Modals state
  showOpenModal = signal<boolean>(false);
  showCloseModal = signal<boolean>(false);
  showXReportModal = signal<boolean>(false);
  showCheckoutModal = signal<boolean>(false);

  // Form states for modals
  openCashierName = signal<string>('Front Clerk');
  openStartingFloat = signal<number>(150);

  closeActualCash = signal<number>(0);
  closeNotes = signal<string>('');

  latestReport = signal<RegisterReport | null>(null);

  // Checkout payment state
  paymentMethod = signal<'cash' | 'card' | 'other'>('cash');
  tenderedCash = signal<number>(0);

  // Computations
  subtotal = computed(() => this.posService.getCartSubtotal());
  taxAmount = computed(() => this.posService.getCartTaxAmount());
  total = computed(() => this.posService.getCartTotal());

  changeDue = computed(() => {
    if (this.paymentMethod() !== 'cash') return 0;
    const tendered = this.tenderedCash();
    const tot = this.total();
    return Math.max(0, Math.round((tendered - tot + Number.EPSILON) * 100) / 100);
  });

  expectedDrawerCash = computed(() => {
    const s = this.currentSession();
    if (!s) return 0;
    return s.startingFloat + s.cashSales - s.cashRefunds;
  });

  cashDiscrepancy = computed(() => {
    return Math.round((this.closeActualCash() - this.expectedDrawerCash() + Number.EPSILON) * 100) / 100;
  });

  constructor() {
    // Check if register needs opening
    setTimeout(() => {
      if (!this.currentSession()) {
        this.showOpenModal.set(true);
      }
    }, 200);
  }

  formatCurrency(val: number): string {
    return this.currencyService.format(val);
  }

  // Cart operations
  onProductSelected(product: Product): void {
    if (!this.currentSession()) {
      this.showOpenModal.set(true);
      return;
    }
    this.posService.addToCart(product, 1);
  }

  incrementQty(index: number): void {
    const item = this.cart()[index];
    this.posService.updateCartItemQuantity(index, item.quantity + 1);
  }

  decrementQty(index: number): void {
    const item = this.cart()[index];
    this.posService.updateCartItemQuantity(index, item.quantity - 1);
  }

  removeItem(index: number): void {
    this.posService.removeCartItem(index);
  }

  clearCart(): void {
    this.posService.clearCart();
  }

  onDiscountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.posService.setCartDiscount(Number(input.value) || 0);
  }

  onNoteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.posService.setCartNote(input.value);
  }

  // Register Session Controls
  openRegisterModal(): void {
    this.showOpenModal.set(true);
  }

  async confirmOpenRegister(): Promise<void> {
    await this.posService.openSession(this.openCashierName(), this.openStartingFloat());
    this.showOpenModal.set(false);
  }

  async openXReport(): Promise<void> {
    const report = await this.posService.generateXReport();
    this.latestReport.set(report);
    this.showXReportModal.set(true);
  }

  openCloseRegisterModal(): void {
    this.closeActualCash.set(this.expectedDrawerCash());
    this.showCloseModal.set(true);
  }

  async confirmCloseRegister(): Promise<void> {
    const zReport = await this.posService.closeSession(this.closeActualCash(), this.closeNotes());
    this.latestReport.set(zReport);
    this.showCloseModal.set(false);
    this.showXReportModal.set(true); // show final Z-report summary
  }

  // Checkout
  openCheckout(): void {
    if (!this.currentSession()) {
      this.showOpenModal.set(true);
      return;
    }
    if (this.cart().length === 0) return;
    this.tenderedCash.set(this.total());
    this.showCheckoutModal.set(true);
  }

  setTenderedPreset(amount: number): void {
    this.tenderedCash.set(amount);
  }

  async completeCheckout(): Promise<void> {
    const tot = this.total();
    const method = this.paymentMethod();

    const payment: PosPaymentRecord = {
      method,
      amount: tot,
      changeDue: method === 'cash' ? this.changeDue() : 0
    };

    const receiptDoc = await this.posService.checkout([payment]);
    this.showCheckoutModal.set(false);

    // Follow §3 edit -> preview philosophy: Navigate directly to receipt preview!
    this.router.navigate(['/receipts', receiptDoc.docNumber, 'preview']);
  }
}
