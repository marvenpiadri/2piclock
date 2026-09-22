export type LedgerEntryType = 'income' | 'expense';

export interface LedgerEntry {
  id: string;
  date: string;            // YYYY-MM-DD
  description: string;
  category: string;        // 'Sales Invoice', 'POS Store Sale', 'Credit Memo', 'Refund', etc.
  type: LedgerEntryType;   // 'income' | 'expense'
  amount: number;
  currency: string;
  paymentMethod?: string;  // 'cash', 'card', 'bank_transfer', etc.
  status: 'cleared' | 'pending' | 'reconciled' | 'voided';
  
  // Linkages
  docId?: string;
  docNumber?: string;
  docType?: string;
  clientId?: string;
  clientName?: string;
  sessionId?: string;
  
  runningBalance?: number;
  createdAt: string;
}

export interface LedgerPeriodSummary {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  outstandingReceivables: number;
  transactionCount: number;
}
