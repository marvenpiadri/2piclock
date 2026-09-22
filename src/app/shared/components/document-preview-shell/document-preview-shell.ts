import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BusinessDocument, DocumentStatus, PaperSize } from '../../../core/models/document.model';
import { DocumentTypeConfig } from '../../../core/models/document-type-config.model';
import { TemplateRendererComponent } from '../template-renderer/template-renderer';
import { DocumentService } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-preview-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TemplateRendererComponent
  ],
  templateUrl: './document-preview-shell.html',
  styleUrl: './document-preview-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreviewShellComponent implements OnInit {
  private router = inject(Router);
  private documentService = inject(DocumentService);

  document = input.required<BusinessDocument>();
  config = input.required<DocumentTypeConfig>();

  statusChange = output<DocumentStatus>();
  delete = output<void>();

  // Interactive preview overrides
  selectedTemplate = signal<string>('modern');
  selectedPaperSize = signal<PaperSize>('a4');
  isPrinting = signal<boolean>(false);
  isGeneratingPdf = signal<boolean>(false);

  ngOnInit(): void {
    if (this.document().templateId) {
      this.selectedTemplate.set(this.document().templateId);
    }
    if (this.document().paperSize) {
      this.selectedPaperSize.set(this.document().paperSize);
    }
  }

  setTemplate(tpl: string): void {
    this.selectedTemplate.set(tpl);
  }

  setPaperSize(size: PaperSize): void {
    this.selectedPaperSize.set(size);
  }

  onPrint(): void {
    window.print();
  }

  async onDownloadPdf(): Promise<void> {
    this.isGeneratingPdf.set(true);
    try {
      const element = document.getElementById('document-pdf-root');
      if (!element) {
        console.error('Document PDF root element not found');
        window.print();
        return;
      }

      // Safe dynamic lazy-loading wrapper
      const lib = await import('html2pdf.js');
      const html2pdf = (lib as any).default || lib;

      const docName = this.document().docNumber || 'document';
      const paperFormat = this.selectedPaperSize() === 'letter' ? 'letter' : 'a4';

      const options = {
        margin: 0,
        filename: `${docName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              #document-pdf-root, .document-render-sheet, .document-preview-sheet, .printable-document-container {
                box-shadow: none !important;
                border: none !important;
                border-width: 0px !important;
                border-style: none !important;
                border-radius: 0px !important;
                min-height: auto !important;
                margin: 0px !important;
                padding: 10mm !important; /* Standard print margin */
              }
              .template-bold .doc-header-block {
                margin: -10mm -10mm 20px -10mm !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          }
        },
        jsPDF: { unit: 'mm', format: paperFormat, orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.print-item-row', '.doc-summary-footer-block', '.info-clause-box'] }
      } as any;

      await html2pdf().from(element).set(options).save();
    } catch (err) {
      console.error('Error generating PDF with html2pdf:', err);
      // Fallback
      window.print();
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  async onDuplicate(): Promise<void> {
    const doc = this.document();
    const cloned = await this.documentService.duplicateDocument(doc.id);
    if (cloned) {
      this.router.navigate([`/${cloned.docType}/${cloned.docNumber}/edit`]);
    }
  }

  onEdit(): void {
    const doc = this.document();
    this.router.navigate([`/${doc.docType}/${doc.docNumber}/edit`]);
  }

  updateStatus(status: DocumentStatus): void {
    this.statusChange.emit(status);
  }

  confirmDelete(): void {
    if (confirm(`Are you sure you want to delete ${this.document().docNumber}? This cannot be undone.`)) {
      this.delete.emit();
    }
  }
}
