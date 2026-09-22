export type LineLayoutMode = 'quantity' | 'hours' | 'flatRate';

export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'completed';

export interface DocumentLineItem {
  id: string;
  description: string;
  quantity: number;      // Fixed at 1 internally in flatRate mode
  unitCost: number;      // Hourly rate in 'hours' mode, amount in 'flatRate' mode
  taxRate: number;       // Percentage e.g. 20 for 20%
  discountPercent: number;
  amount: number;        // Computed: quantity * unitCost * (1 - discount/100)
}

export interface DocumentParty {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;       // VAT / Tax Reg / Business No.
  logoUrl?: string;
  bankDetails?: string;
}

export type PaperSize = 'a4' | 'letter' | 'thermal-80mm' | 'thermal-58mm';

export interface BusinessDocument {
  id: string;
  docNumber: string;       // e.g. INV-2026-0001
  slug: string;            // human readable slug e.g. inv-2026-0001
  docType: string;         // 'invoices', 'quotes', 'purchase-orders', etc.
  docTypeLabel: string;    // 'Tax Invoice', 'Quote / Estimate', etc.
  title?: string;
  status: DocumentStatus;
  currency: string;
  issueDate: string;       // YYYY-MM-DD
  dueDate?: string;        // YYYY-MM-DD
  purchaseOrderRef?: string;
  
  // Parties
  company: DocumentParty;
  client: DocumentParty;
  clientId?: string;

  // Configuration
  lineLayoutMode: LineLayoutMode;
  templateId: string;      // 'modern', 'classic', 'bold', 'thermal-80mm', 'thermal-58mm'
  paperSize: PaperSize;
  hasPricing: boolean;     // e.g. false for Delivery Note

  // Line items
  items: DocumentLineItem[];

  // Totals (Computed)
  subtotal: number;
  taxRate: number;         // Overall document tax % if applied globally
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  depositPaid: number;
  balanceDue: number;

  // Notes & terms
  notes?: string;
  terms?: string;
  bankDetails?: string;
  shippingInstructions?: string; // for PO & Delivery notes
  specialFields?: Record<string, any>; // For Bill of Lading, custom documents

  createdAt: string;
  updatedAt: string;
}
