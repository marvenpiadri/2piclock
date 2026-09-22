import { Injectable, inject, signal } from '@angular/core';
import { db } from '../db/app-database';
import { BusinessDocument, DocumentStatus } from '../models/document.model';
import { SettingsService } from './settings.service';
import { CalculationService } from './calculation.service';
import { getDocConfig } from '../config/document-type-config';
import { LedgerEntry } from '../models/ledger.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private settingsService = inject(SettingsService);
  private calculationService = inject(CalculationService);

  readonly documents = signal<BusinessDocument[]>([]);

  async loadDocuments(): Promise<BusinessDocument[]> {
    const list = await db.documents.orderBy('createdAt').reverse().toArray();
    this.documents.set(list);
    return list;
  }

  async getDocumentById(id: string): Promise<BusinessDocument | undefined> {
    return await db.documents.get(id);
  }

  /**
   * Look up by docNumber or slug (case-insensitive)
   */
  async getDocumentByNumberOrSlug(param: string): Promise<BusinessDocument | undefined> {
    const cleaned = param.trim().toLowerCase();
    const all = await db.documents.toArray();
    return all.find(d => 
      d.docNumber.toLowerCase() === cleaned || 
      d.slug.toLowerCase() === cleaned ||
      d.id === param
    );
  }

  /**
   * Create a new blank document draft for a given docType
   */
  async createDraft(docType: string): Promise<BusinessDocument> {
    const s = await this.settingsService.loadSettings();
    const config = getDocConfig(docType);
    const nextNumber = await this.settingsService.getNextDocumentNumber(docType);

    const now = new Date();
    const issueDate = now.toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const newDoc: BusinessDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      docNumber: nextNumber,
      slug: nextNumber.toLowerCase(),
      docType: config.docType,
      docTypeLabel: config.singularName,
      status: 'draft',
      currency: s.defaultCurrency || 'USD',
      issueDate,
      dueDate,
      company: { ...s.company },
      client: { name: '' },
      lineLayoutMode: config.defaultLineLayoutMode,
      templateId: s.defaultFormalTemplate || config.defaultTemplateId,
      paperSize: s.paperSize || 'a4',
      hasPricing: config.hasPricing,
      items: [
        {
          id: `item-${Date.now()}-1`,
          description: '',
          quantity: 1,
          unitCost: 0,
          taxRate: s.defaultTaxRate || 0,
          discountPercent: 0,
          amount: 0
        }
      ],
      subtotal: 0,
      taxRate: s.defaultTaxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      shippingAmount: 0,
      total: 0,
      depositPaid: 0,
      balanceDue: 0,
      notes: '',
      terms: s.defaultPaymentTerms || '',
      bankDetails: s.company.bankDetails || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return newDoc;
  }

  /**
   * Save (create or update) document and sync Smart Ledger if paid
   */
  async saveDocument(doc: BusinessDocument): Promise<BusinessDocument> {
    // 1. Recompute authoritative totals to eliminate any mathematical drift
    const totals = this.calculationService.calculateDocumentTotals(
      doc.items,
      doc.taxRate,
      doc.discountAmount,
      doc.shippingAmount,
      doc.depositPaid
    );

    const updatedDoc: BusinessDocument = {
      ...doc,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      shippingAmount: totals.shippingAmount,
      total: totals.total,
      depositPaid: totals.depositPaid,
      balanceDue: totals.balanceDue,
      slug: doc.docNumber.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    // Check if new document
    const existing = await db.documents.get(updatedDoc.id);
    const isNew = !existing;

    await db.documents.put(updatedDoc);

    if (isNew) {
      await this.settingsService.incrementDocumentNumber(updatedDoc.docType);
    }

    // 2. Synchronize with Smart Ledger
    await this.syncLedgerForDocument(updatedDoc);

    await this.loadDocuments();
    return updatedDoc;
  }

  /**
   * Update status directly and reconcile ledger
   */
  async updateStatus(id: string, newStatus: DocumentStatus): Promise<void> {
    const doc = await db.documents.get(id);
    if (!doc) return;

    doc.status = newStatus;
    doc.updatedAt = new Date().toISOString();
    
    // If marked paid and deposit is 0, set deposit to total
    if (newStatus === 'paid' && doc.depositPaid < doc.total) {
      doc.depositPaid = doc.total;
      doc.balanceDue = 0;
    }

    await db.documents.put(doc);
    await this.syncLedgerForDocument(doc);
    await this.loadDocuments();
  }

  /**
   * Duplicate existing document as a new draft
   */
  async duplicateDocument(id: string): Promise<BusinessDocument | undefined> {
    const source = await db.documents.get(id);
    if (!source) return undefined;

    const nextNumber = await this.settingsService.getNextDocumentNumber(source.docType);
    const now = new Date();

    const duplicated: BusinessDocument = {
      ...source,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      docNumber: nextNumber,
      slug: nextNumber.toLowerCase(),
      status: 'draft',
      depositPaid: 0,
      balanceDue: source.total,
      issueDate: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.documents.put(duplicated);
    await this.settingsService.incrementDocumentNumber(duplicated.docType);
    await this.loadDocuments();
    return duplicated;
  }

  /**
   * Delete document and remove associated ledger entry
   */
  async deleteDocument(id: string): Promise<void> {
    await db.documents.delete(id);
    // Remove linked ledger entry if any
    const linkedEntries = await db.ledgerEntries.where('docId').equals(id).toArray();
    for (const e of linkedEntries) {
      await db.ledgerEntries.delete(e.id);
    }
    await this.loadDocuments();
  }

  /**
   * Internal synchronization between documents and Smart Ledger
   */
  private async syncLedgerForDocument(doc: BusinessDocument): Promise<void> {
    const existingEntries = await db.ledgerEntries.where('docId').equals(doc.id).toArray();

    if (doc.status === 'paid' || doc.status === 'completed') {
      const isCreditMemo = doc.docType === 'credit-notes';
      const entryType = isCreditMemo ? 'expense' : 'income';

      const entry: LedgerEntry = {
        id: existingEntries[0]?.id || `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: doc.issueDate,
        description: `${doc.docTypeLabel} ${doc.docNumber}${doc.client.name ? ' (' + doc.client.name + ')' : ''}`,
        category: doc.docTypeLabel,
        type: entryType,
        amount: doc.total,
        currency: doc.currency,
        paymentMethod: 'Bank / Direct',
        status: 'cleared',
        docId: doc.id,
        docNumber: doc.docNumber,
        docType: doc.docType,
        clientId: doc.clientId,
        clientName: doc.client.name,
        createdAt: doc.updatedAt
      };
      await db.ledgerEntries.put(entry);
    } else if (doc.status === 'void') {
      for (const e of existingEntries) {
        await db.ledgerEntries.update(e.id, { status: 'voided' });
      }
    } else {
      // If draft or sent, remove cleared ledger entry if it previously was paid
      for (const e of existingEntries) {
        await db.ledgerEntries.delete(e.id);
      }
    }
  }
}
