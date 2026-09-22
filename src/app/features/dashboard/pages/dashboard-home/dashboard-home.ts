import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../../../core/services/document.service';
import { PosService } from '../../../../core/services/pos.service';
import { LedgerService } from '../../../../core/services/ledger.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { DOCUMENT_TYPE_CONFIGS } from '../../../../core/config/document-type-config';
import { DocumentTypeConfig } from '../../../../core/models/document-type-config.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHomePage {
  private documentService = inject(DocumentService);
  private posService = inject(PosService);
  private ledgerService = inject(LedgerService);
  private currencyService = inject(CurrencyService);

  readonly documents = this.documentService.documents;
  readonly posSession = this.posService.currentSession;
  readonly totalIncome = this.ledgerService.totalIncome;
  readonly outstandingReceivables = this.ledgerService.outstandingReceivables;

  // List of all document type configurations for the document launcher grid
  readonly docConfigs: DocumentTypeConfig[] = Object.values(DOCUMENT_TYPE_CONFIGS);

  // Computed metrics
  totalInvoicedThisMonth = computed(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.documents()
      .filter(d => d.issueDate.startsWith(currentMonthPrefix))
      .reduce((sum, d) => sum + (d.total || 0), 0);
  });

  // Recent 8 transactions
  recentDocuments = computed(() => {
    return this.documents().slice(0, 8);
  });

  // Cash on hand in drawer
  drawerCashOnHand = computed(() => {
    const s = this.posSession();
    if (!s) return 0;
    return s.startingFloat + s.cashSales - s.cashRefunds;
  });

  formatCurrency(val: number, currency?: string): string {
    return this.currencyService.format(val, currency);
  }
}
