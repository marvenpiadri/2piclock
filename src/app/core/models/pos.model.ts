export type PaymentMethod = 'cash' | 'card' | 'other';

export interface PosCartItem {
  productId: string;
  name: string;
  description?: string;
  unitCost: number;
  quantity: number;
  taxRate: number;
  discountPercent: number;
  amount: number;
}

export interface PosPaymentRecord {
  method: PaymentMethod;
  amount: number;
  tendered?: number;
  changeDue?: number;
  reference?: string;
}

export interface PosSale {
  id: string;
  receiptNumber: string;   // e.g. RCT-2026-0001
  sessionId: string;
  date: string;
  time: string;
  cashierName: string;
  items: PosCartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  payments: PosPaymentRecord[];
  notes?: string;
  docId?: string;          // Linked BusinessDocument id
}

export interface RegisterReport {
  timestamp: string;
  type: 'X-Report' | 'Z-Report';
  cashierName: string;
  startingFloat: number;
  totalSales: number;
  salesCount: number;
  byPaymentMethod: {
    cash: number;
    card: number;
    other: number;
  };
  totalRefunds: number;
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
}

export interface RegisterSession {
  id: string;
  sessionNumber: string;   // e.g. SESS-2026-0001
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  startingFloat: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  cashRefunds: number;
  salesCount: number;
  expectedCash: number;
  actualCashCounted?: number;
  discrepancy?: number;
  xReports: RegisterReport[];
  zReport?: RegisterReport;
  notes?: string;
}
