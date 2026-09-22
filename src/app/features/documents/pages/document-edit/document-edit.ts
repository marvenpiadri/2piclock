import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DOCUMENT_TYPE_CONFIGS } from '../../../../core/config/document-type-config';
import { DocumentTypeConfig } from '../../../../core/models/document-type-config.model';
import { DocumentService } from '../../../../core/services/document.service';
import { BusinessDocument } from '../../../../core/models/document.model';
import { DocumentFormShellComponent } from '../../../../shared/components/document-form-shell/document-form-shell';

@Component({
  selector: 'app-document-edit',
  standalone: true,
  imports: [CommonModule, DocumentFormShellComponent],
  templateUrl: './document-edit.html',
  styleUrl: './document-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);

  docTypeSlug = signal<string>('invoices');
  docNumber = signal<string | null>(null);
  isNew = signal<boolean>(true);
  loading = signal<boolean>(true);
  currentDocument = signal<BusinessDocument | null>(null);

  currentConfig = computed<DocumentTypeConfig>(() => {
    const slug = this.docTypeSlug();
    return DOCUMENT_TYPE_CONFIGS[slug] || DOCUMENT_TYPE_CONFIGS['invoices'];
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('docType') || 'invoices';
      const num = params.get('docNumber');
      this.docTypeSlug.set(type);
      this.docNumber.set(num);
      this.loadDoc(type, num);
    });
  }

  async loadDoc(type: string, docNumber: string | null): Promise<void> {
    this.loading.set(true);
    if (!docNumber || docNumber === 'new') {
      this.isNew.set(true);
      const newDoc = await this.documentService.createDraft(type);
      this.currentDocument.set(newDoc);
      this.loading.set(false);
    } else {
      this.isNew.set(false);
      const doc = await this.documentService.getDocumentByNumberOrSlug(docNumber);
      if (doc) {
        this.currentDocument.set(doc);
      } else {
        // Fallback: create fresh if not found
        const fresh = await this.documentService.createDraft(type);
        this.currentDocument.set(fresh);
      }
      this.loading.set(false);
    }
  }

  async onSave(doc: BusinessDocument): Promise<void> {
    this.currentDocument.set(doc);
    await this.documentService.saveDocument(doc);
  }

  async onSaveAndPreview(doc: BusinessDocument): Promise<void> {
    this.currentDocument.set(doc);
    const saved = await this.documentService.saveDocument(doc);
    this.router.navigate([`/${saved.docType}/${saved.docNumber}/preview`]);
  }
}
