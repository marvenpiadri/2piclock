import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DOCUMENT_TYPE_CONFIGS } from '../../../../core/config/document-type-config';
import { DocumentTypeConfig } from '../../../../core/models/document-type-config.model';
import { DocumentService } from '../../../../core/services/document.service';
import { BusinessDocument, DocumentStatus } from '../../../../core/models/document.model';
import { DocumentPreviewShellComponent } from '../../../../shared/components/document-preview-shell/document-preview-shell';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [CommonModule, RouterModule, DocumentPreviewShellComponent],
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreviewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);

  docTypeSlug = signal<string>('invoices');
  docNumber = signal<string>('');
  loading = signal<boolean>(true);
  currentDocument = signal<BusinessDocument | null>(null);

  currentConfig = computed<DocumentTypeConfig>(() => {
    const slug = this.docTypeSlug();
    return DOCUMENT_TYPE_CONFIGS[slug] || DOCUMENT_TYPE_CONFIGS['invoices'];
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('docType') || 'invoices';
      const num = params.get('docNumber') || '';
      this.docTypeSlug.set(type);
      this.docNumber.set(num);
      this.loadDoc(num);
    });
  }

  async loadDoc(num: string): Promise<void> {
    this.loading.set(true);
    const doc = await this.documentService.getDocumentByNumberOrSlug(num);
    if (doc) {
      this.currentDocument.set(doc);
    }
    this.loading.set(false);
  }

  async onStatusChange(status: DocumentStatus): Promise<void> {
    const doc = this.currentDocument();
    if (!doc) return;
    await this.documentService.updateStatus(doc.id, status);
    this.currentDocument.set({ ...doc, status });
  }

  async onDelete(): Promise<void> {
    const doc = this.currentDocument();
    if (!doc) return;
    await this.documentService.deleteDocument(doc.id);
    this.router.navigate([`/${this.docTypeSlug()}`]);
  }
}
