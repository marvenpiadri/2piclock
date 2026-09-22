import { Injectable, inject, signal } from '@angular/core';
import { db } from '../db/app-database';
import { PosCartItem, PosPaymentRecord, PosSale, RegisterReport, RegisterSession } from '../models/pos.model';
import { Product } from '../models/product.model';
import { SettingsService } from './settings.service';
import { DocumentService } from './document.service';
import { CalculationService } from './calculation.service';
import { LedgerEntry } from '../models/ledger.model';
import { BusinessDocument } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private settingsService = inject(SettingsService);
  private documentService = inject(DocumentService);
  private calculationService = inject(CalculationService);

  readonly currentSession = signal<RegisterSession | null>(null);
  readonly cart = signal<PosCartItem[]>([]);
  readonly currentDiscount = signal<number>(0);
  readonly currentNote = signal<string>('');

  constructor() {
    this.restoreActiveSession();
  }

  async restoreActiveSession(): Promise<RegisterSession | null> {
    const openSessions = await db.posSessions.where('status').equals('open').toArray();
    if (openSessions.length > 0) {
      const active = openSessions[0];
      this.currentSession.set(active);
      return active;
    }
    this.currentSession.set(null);
    return null;
  }

  /**
   * Open Register Session with starting float
   */
  async openSession(cashierName: string, startingFloat: number): Promise<RegisterSession> {
    const sessionCount = await db.posSessions.count();
    const sessionNumber = `SESS-${new Date().getFullYear()}-${String(sessionCount + 1).padStart(4, '0')}`;

    const newSession: RegisterSession = {
      id: `sess-${Date.now()}`,
      sessionNumber,
      cashierName: cashierName.trim() || 'Store Clerk',
      openedAt: new Date().toISOString(),
      status: 'open',
      startingFloat: Math.max(0, startingFloat),
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      cashRefunds: 0,
      salesCount: 0,
      expectedCash: Math.max(0, startingFloat),
      xReports: []
    };

    await db.posSessions.put(newSession);
    this.currentSession.set(newSession);
    return newSession;
  }

  /**
   * Generate X-Report (Mid-session summary without closing register)
   */
  async generateXReport(): Promise<RegisterReport> {
    const session = this.currentSession();
    if (!session) throw new Error('No active register session');

    const report: RegisterReport = {
      timestamp: new Date().toISOString(),
      type: 'X-Report',
      cashierName: session.cashierName,
      startingFloat: session.startingFloat,
      totalSales: session.cashSales + session.cardSales + session.otherSales,
      salesCount: session.salesCount,
      byPaymentMethod: {
        cash: session.cashSales,
        card: session.cardSales,
        other: session.otherSales
      },
      totalRefunds: session.cashRefunds,
      expectedCash: session.expectedCash
    };

    session.xReports = [...(session.xReports || []), report];
    await db.posSessions.put(session);
    this.currentSession.set({ ...session });
    return report;
  }

  /**
   * Close Register Session with Z-Report and cash count reconciliation
   */
  async closeSession(actualCashCounted: number, notes?: string): Promise<RegisterReport> {
    const session = this.currentSession();
    if (!session) throw new Error('No active register session');

    const expected = session.startingFloat + session.cashSales - session.cashRefunds;
    const actual = Math.max(0, actualCashCounted);
    const discrepancy = actual - expected; // positive = overage, negative = shortage

    const zReport: RegisterReport = {
      timestamp: new Date().toISOString(),
      type: 'Z-Report',
      cashierName: session.cashierName,
      startingFloat: session.startingFloat,
      totalSales: session.cashSales + session.cardSales + session.otherSales,
      salesCount: session.salesCount,
      byPaymentMethod: {
        cash: session.cashSales,
        card: session.cardSales,
        other: session.otherSales
      },
      totalRefunds: session.cashRefunds,
      expectedCash: expected,
      actualCash: actual,
      discrepancy
    };

    const closedSession: RegisterSession = {
      ...session,
      closedAt: new Date().toISOString(),
      status: 'closed',
      expectedCash: expected,
      actualCashCounted: actual,
      discrepancy,
      zReport,
      notes
    };

    await db.posSessions.put(closedSession);
    this.currentSession.set(null);
    this.clearCart();
    return zReport;
  }

  // --- Cart Management ---

  addToCart(product: Product, quantity = 1): void {
    const current = this.cart();
    const existingIndex = current.findIndex(item => item.productId === product.id);

    if (existingIndex > -1) {
      const updated = [...current];
      const newQty = updated[existingIndex].quantity + quantity;
      const amount = this.calculationService.calculateLineAmount(
        updated[existingIndex].unitCost,
        newQty,
        updated[existingIndex].discountPercent
      );
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        amount
      };
      this.cart.set(updated);
    } else {
      const amount = this.calculationService.calculateLineAmount(
        product.unitCost,
        quantity,
        0
      );
      const item: PosCartItem = {
        productId: product.id,
        name: product.name,
        description: product.description,
        unitCost: product.unitCost,
        quantity,
        taxRate: product.taxRate || 0,
        discountPercent: 0,
        amount
      };
      this.cart.set([...current, item]);
    }
  }

  updateCartItemQuantity(index: number, quantity: number): void {
    const current = [...this.cart()];
    if (quantity <= 0) {
      current.splice(index, 1);
    } else {
      const item = current[index];
      const amount = this.calculationService.calculateLineAmount(item.unitCost, quantity, item.discountPercent);
      current[index] = { ...item, quantity, amount };
    }
    this.cart.set(current);
  }

  removeCartItem(index: number): void {
    const current = [...this.cart()];
    current.splice(index, 1);
    this.cart.set(current);
  }

  setCartDiscount(discountAmount: number): void {
    this.currentDiscount.set(Math.max(0, discountAmount));
  }

  setCartNote(note: string): void {
    this.currentNote.set(note);
  }

  clearCart(): void {
    this.cart.set([]);
    this.currentDiscount.set(0);
    this.currentNote.set('');
  }

  getCartSubtotal(): number {
    return this.cart().reduce((sum, item) => sum + item.amount, 0);
  }

  getCartTaxAmount(): number {
    return this.cart().reduce((sum, item) => {
      return sum + this.calculationService.calculateTaxAmount(item.amount, item.taxRate);
    }, 0);
  }

  getCartTotal(): number {
    const subtotal = this.getCartSubtotal();
    const tax = this.getCartTaxAmount();
    const discount = this.currentDiscount();
    return Math.max(0, subtotal + tax - discount);
  }

  /**
   * Complete checkout:
   * 1. Records PosSale in DB
   * 2. Updates active RegisterSession sales totals
   * 3. Generates a formal BusinessDocument (Sales Receipt) in DB
   * 4. Auto-creates a LedgerEntry in Smart Ledger
   * 5. Returns the generated BusinessDocument for preview routing
   */
  async checkout(payments: PosPaymentRecord[]): Promise<BusinessDocument> {
    const session = this.currentSession();
    if (!session) throw new Error('Please open register session first');

    const cartItems = this.cart();
    if (cartItems.length === 0) throw new Error('Cart is empty');

    const s = await this.settingsService.loadSettings();
    const subtotal = this.getCartSubtotal();
    const taxAmount = this.getCartTaxAmount();
    const discountAmount = this.currentDiscount();
    const total = this.getCartTotal();

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // Sequential receipt number
    const receiptNumber = await this.settingsService.getNextDocumentNumber('receipts');

    // 1. Create Business Document (Sales Receipt)
    const receiptDoc: BusinessDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      docNumber: receiptNumber,
      slug: receiptNumber.toLowerCase(),
      docType: 'receipts',
      docTypeLabel: 'Sales Receipt',
      title: 'Counter Store Sale',
      status: 'completed',
      currency: s.defaultCurrency || 'USD',
      issueDate: dateStr,
      company: { ...s.company },
      client: {
        name: 'Walk-in Customer'
      },
      lineLayoutMode: 'flatRate',
      templateId: s.defaultReceiptTemplate || 'thermal-80mm',
      paperSize: s.defaultReceiptTemplate === 'thermal-58mm' ? 'thermal-58mm' : 'thermal-80mm',
      hasPricing: true,
      items: cartItems.map((item, idx) => ({
        id: `item-${idx + 1}`,
        description: item.name + (item.description ? ` (${item.description})` : ''),
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxRate: item.taxRate,
        discountPercent: item.discountPercent,
        amount: item.amount
      })),
      subtotal,
      taxRate: 0,
      taxAmount,
      discountAmount,
      shippingAmount: 0,
      total,
      depositPaid: total,
      balanceDue: 0,
      notes: this.currentNote() || 'Payment completed. Thank you for your purchase!',
      terms: 'All retail sales final. Receipt required for exchange within 14 days.',
      specialFields: {
        cashier: session.cashierName,
        sessionId: session.id,
        payments
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.documents.put(receiptDoc);
    await this.settingsService.incrementDocumentNumber('receipts');

    // 2. Record PosSale
    const posSale: PosSale = {
      id: `sale-${Date.now()}`,
      receiptNumber,
      sessionId: session.id,
      date: dateStr,
      time: timeStr,
      cashierName: session.cashierName,
      items: [...cartItems],
      subtotal,
      taxRate: 0,
      taxAmount,
      discountAmount,
      total,
      payments,
      notes: this.currentNote(),
      docId: receiptDoc.id
    };
    await db.posSales.put(posSale);

    // 3. Update active session numbers
    let cashPaid = 0;
    let cardPaid = 0;
    let otherPaid = 0;

    for (const p of payments) {
      if (p.method === 'cash') cashPaid += p.amount;
      else if (p.method === 'card') cardPaid += p.amount;
      else otherPaid += p.amount;
    }

    session.cashSales += cashPaid;
    session.cardSales += cardPaid;
    session.otherSales += otherPaid;
    session.salesCount += 1;
    session.expectedCash = session.startingFloat + session.cashSales - session.cashRefunds;

    await db.posSessions.put(session);
    this.currentSession.set({ ...session });

    // 4. Create Ledger Entry
    const primaryPaymentMethod = payments.map(p => p.method).join(', ') || 'Cash';
    const ledgerEntry: LedgerEntry = {
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      description: `POS Sale #${receiptNumber} (${session.cashierName})`,
      category: 'POS Store Sale',
      type: 'income',
      amount: total,
      currency: s.defaultCurrency || 'USD',
      paymentMethod: primaryPaymentMethod,
      status: 'cleared',
      docId: receiptDoc.id,
      docNumber: receiptNumber,
      docType: 'receipts',
      sessionId: session.id,
      createdAt: now.toISOString()
    };
    await db.ledgerEntries.put(ledgerEntry);

    // 5. Reset cart
    this.clearCart();

    return receiptDoc;
  }
}
