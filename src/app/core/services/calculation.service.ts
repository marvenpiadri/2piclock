import { Injectable } from '@angular/core';
import { DocumentLineItem } from '../models/document.model';

export interface DocumentTotalsResult {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  depositPaid: number;
  balanceDue: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculationService {

  /**
   * Single authoritative line item calculation
   */
  calculateLineAmount(
    unitCost: number,
    quantity: number,
    discountPercent = 0
  ): number {
    const cost = Number.isFinite(unitCost) ? Math.max(0, unitCost) : 0;
    const qty = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
    const disc = Number.isFinite(discountPercent) ? Math.min(100, Math.max(0, discountPercent)) : 0;

    const gross = cost * qty;
    const discounted = gross * (1 - disc / 100);
    return Math.round((discounted + Number.EPSILON) * 100) / 100;
  }

  /**
   * Single authoritative tax amount calculation
   */
  calculateTaxAmount(baseAmount: number, taxRatePercent: number): number {
    const base = Number.isFinite(baseAmount) ? Math.max(0, baseAmount) : 0;
    const rate = Number.isFinite(taxRatePercent) ? Math.max(0, taxRatePercent) : 0;
    return Math.round((base * (rate / 100) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Single authoritative document totals calculation
   */
  calculateDocumentTotals(
    items: DocumentLineItem[],
    documentTaxRate = 0,
    wholeDocumentDiscount = 0,
    shippingAmount = 0,
    depositPaid = 0
  ): DocumentTotalsResult {
    // 1. Calculate subtotal from items
    let subtotal = 0;
    let itemizedTaxTotal = 0;
    let hasItemizedTaxes = false;

    for (const item of items) {
      const lineAmount = this.calculateLineAmount(item.unitCost, item.quantity, item.discountPercent);
      subtotal += lineAmount;

      if (item.taxRate && item.taxRate > 0) {
        hasItemizedTaxes = true;
        itemizedTaxTotal += this.calculateTaxAmount(lineAmount, item.taxRate);
      }
    }
    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    // 2. Determine tax amount
    // If itemized taxes exist across lines, use those; otherwise use the global documentTaxRate
    let taxAmount = 0;
    if (hasItemizedTaxes) {
      taxAmount = Math.round((itemizedTaxTotal + Number.EPSILON) * 100) / 100;
    } else if (documentTaxRate > 0) {
      taxAmount = this.calculateTaxAmount(subtotal, documentTaxRate);
    }

    // 3. Discount, shipping, totals
    const discount = Number.isFinite(wholeDocumentDiscount) ? Math.max(0, wholeDocumentDiscount) : 0;
    const shipping = Number.isFinite(shippingAmount) ? Math.max(0, shippingAmount) : 0;

    const total = Math.max(0, Math.round((subtotal + taxAmount - discount + shipping + Number.EPSILON) * 100) / 100);

    const deposit = Number.isFinite(depositPaid) ? Math.max(0, depositPaid) : 0;
    const balanceDue = Math.max(0, Math.round((total - deposit + Number.EPSILON) * 100) / 100);

    return {
      subtotal,
      taxAmount,
      discountAmount: discount,
      shippingAmount: shipping,
      total,
      depositPaid: deposit,
      balanceDue
    };
  }
}
