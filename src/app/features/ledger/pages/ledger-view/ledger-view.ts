import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LedgerFilterOptions, LedgerService } from '../../../../core/services/ledger.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { ClientService } from '../../../../core/services/client.service';

@Component({
  selector: 'app-ledger-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ledger-view.html',
  styleUrl: './ledger-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LedgerViewPage {
  private ledgerService = inject(LedgerService);
  private currencyService = inject(CurrencyService);
  private clientService = inject(ClientService);

  readonly entries = this.ledgerService.entries;
  readonly totalIncome = this.ledgerService.totalIncome;
  readonly totalExpense = this.ledgerService.totalExpense;
  readonly netProfit = this.ledgerService.netProfit;
  readonly outstandingReceivables = this.ledgerService.outstandingReceivables;
  readonly clients = this.clientService.clients;

  // Filter signals
  startDate = signal<string>('');
  endDate = signal<string>('');
  filterDocType = signal<string>('all');
  filterClient = signal<string>('all');
  filterType = signal<'all' | 'income' | 'expense'>('all');
  searchQuery = signal<string>('');

  constructor() {
    this.ledgerService.refreshLedger();
  }

  formatCurrency(amount: number): string {
    return this.currencyService.format(amount);
  }

  onFilterChange(): void {
    const opts: LedgerFilterOptions = {};
    if (this.startDate()) opts.startDate = this.startDate();
    if (this.endDate()) opts.endDate = this.endDate();
    if (this.filterDocType() !== 'all') opts.docType = this.filterDocType();
    if (this.filterClient() !== 'all') opts.clientId = this.filterClient();
    const fType = this.filterType();
    if (fType === 'income' || fType === 'expense') opts.type = fType;
    if (this.searchQuery().trim()) opts.search = this.searchQuery().trim();

    this.ledgerService.refreshLedger(opts);
  }

  clearFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.filterDocType.set('all');
    this.filterClient.set('all');
    this.filterType.set('all');
    this.searchQuery.set('');
    this.ledgerService.refreshLedger();
  }
}
