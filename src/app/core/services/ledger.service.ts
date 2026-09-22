import { Injectable, signal } from '@angular/core';
import { db, seedInitialDataIfNeeded } from '../db/app-database';
import { LedgerEntry } from '../models/ledger.model';

export interface LedgerFilterOptions {
  startDate?: string;
  endDate?: string;
  docType?: string;
  clientId?: string;
  paymentMethod?: string;
  type?: 'income' | 'expense';
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  readonly entries = signal<LedgerEntry[]>([]);
  readonly totalIncome = signal<number>(0);
  readonly totalExpense = signal<number>(0);
  readonly netProfit = signal<number>(0);
  readonly outstandingReceivables = signal<number>(0);

  constructor() {
    this.refreshLedger();
  }

  async refreshLedger(filters?: LedgerFilterOptions): Promise<LedgerEntry[]> {
    await seedInitialDataIfNeeded();
    const query = await db.ledgerEntries.orderBy('date').toArray();

    // Compute running balance chronologically
    let running = 0;
    const sorted = query.sort((a, b) => (a.date > b.date ? 1 : -1));
    const processed: LedgerEntry[] = sorted.map(entry => {
      if (entry.status !== 'voided') {
        if (entry.type === 'income') {
          running += entry.amount;
        } else {
          running -= entry.amount;
        }
      }
      return {
        ...entry,
        runningBalance: Math.round((running + Number.EPSILON) * 100) / 100
      };
    });

    // Reverse for latest first display
    let result = processed.reverse();

    // Apply filters if provided
    if (filters) {
      if (filters.startDate) {
        result = result.filter(e => e.date >= filters.startDate!);
      }
      if (filters.endDate) {
        result = result.filter(e => e.date <= filters.endDate!);
      }
      if (filters.docType) {
        result = result.filter(e => e.docType === filters.docType);
      }
      if (filters.clientId) {
        result = result.filter(e => e.clientId === filters.clientId);
      }
      if (filters.paymentMethod) {
        result = result.filter(e => e.paymentMethod?.toLowerCase().includes(filters.paymentMethod!.toLowerCase()));
      }
      if (filters.type) {
        result = result.filter(e => e.type === filters.type);
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        result = result.filter(e => 
          e.description.toLowerCase().includes(term) ||
          e.docNumber?.toLowerCase().includes(term) ||
          e.clientName?.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term)
        );
      }
    }

    this.entries.set(result);

    // Calculate income & expenses summary
    let income = 0;
    let expense = 0;
    for (const e of processed) {
      if (e.status !== 'voided') {
        if (e.type === 'income') income += e.amount;
        else expense += e.amount;
      }
    }

    this.totalIncome.set(Math.round((income + Number.EPSILON) * 100) / 100);
    this.totalExpense.set(Math.round((expense + Number.EPSILON) * 100) / 100);
    this.netProfit.set(Math.round((income - expense + Number.EPSILON) * 100) / 100);

    // Calculate outstanding receivables from unpaid / sent invoices
    const unpaidDocs = await db.documents
      .where('status')
      .anyOf('sent', 'overdue')
      .toArray();

    const receivables = unpaidDocs
      .filter(d => d.docType === 'invoices' || d.docType === 'timesheet-invoices' || d.docType === 'retainer-invoices')
      .reduce((sum, d) => sum + (d.balanceDue || d.total), 0);

    this.outstandingReceivables.set(Math.round((receivables + Number.EPSILON) * 100) / 100);

    return result;
  }

  /**
   * Get statement entries for a specific client (used by Statement of Account document type!)
   */
  async getClientStatementLedger(clientId: string, startDate?: string, endDate?: string): Promise<{
    entries: LedgerEntry[];
    startingBalance: number;
    totalDebits: number;
    totalCredits: number;
    endingBalance: number;
  }> {
    let allEntries = await db.ledgerEntries.where('clientId').equals(clientId).sortBy('date');
    if (startDate) {
      allEntries = allEntries.filter(e => e.date >= startDate);
    }
    if (endDate) {
      allEntries = allEntries.filter(e => e.date <= endDate);
    }
    let running = 0;
    let totalDebits = 0;
    let totalCredits = 0;

    const formatted = allEntries.map(e => {
      if (e.type === 'income') {
        running += e.amount;
        totalCredits += e.amount;
      } else {
        running -= e.amount;
        totalDebits += e.amount;
      }
      return {
        ...e,
        runningBalance: running
      };
    });

    return {
      entries: formatted,
      startingBalance: 0,
      totalDebits,
      totalCredits,
      endingBalance: running
    };
  }

  /**
   * Monthly breakdown for charts and periodic summaries
   */
  async getMonthlyBreakdown(year: number = new Date().getFullYear()): Promise<{
    months: string[];
    income: number[];
    expense: number[];
    net: number[];
  }> {
    const all = await db.ledgerEntries.toArray();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const income = new Array(12).fill(0);
    const expense = new Array(12).fill(0);

    for (const e of all) {
      if (e.status === 'voided') continue;
      const d = new Date(e.date);
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        if (e.type === 'income') income[m] += e.amount;
        else expense[m] += e.amount;
      }
    }

    const net = months.map((_, i) => Math.round((income[i] - expense[i] + Number.EPSILON) * 100) / 100);

    return {
      months,
      income: income.map(v => Math.round((v + Number.EPSILON) * 100) / 100),
      expense: expense.map(v => Math.round((v + Number.EPSILON) * 100) / 100),
      net
    };
  }
}
