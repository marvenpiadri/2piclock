import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOCUMENT_TYPE_CONFIGS } from '../../../../core/config/document-type-config';
import { DocumentTypeConfig } from '../../../../core/models/document-type-config.model';
import { DocumentService } from '../../../../core/services/document.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { BusinessDocument } from '../../../../core/models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './document-list.html',
  styleUrl: './document-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentListPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private currencyService = inject(CurrencyService);

  readonly allDocuments = this.documentService.documents;

  docTypeSlug = signal<string>('invoices');
  selectedStatus = signal<string>('all');
  searchQuery = signal<string>('');

  // Configuration for current document route
  currentConfig = computed<DocumentTypeConfig>(() => {
    const slug = this.docTypeSlug();
    return DOCUMENT_TYPE_CONFIGS[slug] || DOCUMENT_TYPE_CONFIGS['invoices'];
  });

  // Filtered documents for this specific type
  filteredDocuments = computed<BusinessDocument[]>(() => {
    const slug = this.docTypeSlug();
    const status = this.selectedStatus();
    const query = this.searchQuery().trim().toLowerCase();

    return this.allDocuments().filter(doc => {
      if (doc.docType !== slug) return false;
      if (status !== 'all' && doc.status !== status) return false;
      if (query) {
        const matchNum = doc.docNumber.toLowerCase().includes(query);
        const matchClient = doc.client.name.toLowerCase().includes(query) || (doc.client.legalName && doc.client.legalName.toLowerCase().includes(query));
        const matchTitle = doc.title && doc.title.toLowerCase().includes(query);
        return matchNum || matchClient || matchTitle;
      }
      return true;
    });
  });

  // Aggregated totals
  totalAmount = computed(() => {
    return this.filteredDocuments().reduce((sum, d) => sum + (d.total || 0), 0);
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('docType') || 'invoices';
      this.docTypeSlug.set(type);
    });
  }

  formatCurrency(amount: number, curr?: string): string {
    return this.currencyService.format(amount, curr);
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  async duplicateDoc(doc: BusinessDocument, event: Event): Promise<void> {
    event.stopPropagation();
    const cloned = await this.documentService.duplicateDocument(doc.id);
    if (cloned) {
      this.router.navigate([`/${cloned.docType}/${cloned.docNumber}/edit`]);
    }
  }

  async deleteDoc(doc: BusinessDocument, event: Event): Promise<void> {
    event.stopPropagation();
    if (confirm(`Delete document ${doc.docNumber}? This cannot be undone.`)) {
      await this.documentService.deleteDocument(doc.id);
    }
  }

  quickPrint(doc: BusinessDocument, event: Event): void {
    event.stopPropagation();
    this.router.navigate([`/${doc.docType}/${doc.docNumber}/preview`]);
  }
}
