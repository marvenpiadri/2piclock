import { Injectable, signal } from '@angular/core';
import { db, seedInitialDataIfNeeded } from '../db/app-database';
import { BusinessProfileSettings } from '../models/settings.model';
import { getDocConfig } from '../config/document-type-config';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  readonly settings = signal<BusinessProfileSettings | null>(null);

  constructor() {
    this.loadSettings();
  }

  async loadSettings(): Promise<BusinessProfileSettings> {
    await seedInitialDataIfNeeded();
    let current = await db.settings.get('current');
    if (!current) {
      await seedInitialDataIfNeeded();
      current = (await db.settings.get('current'))!;
    }
    this.settings.set(current);
    return current;
  }

  async updateSettings(updated: Partial<BusinessProfileSettings>): Promise<BusinessProfileSettings> {
    const current = await this.loadSettings();
    const merged: BusinessProfileSettings = {
      ...current,
      ...updated,
      updatedAt: new Date().toISOString()
    };
    await db.settings.put(merged);
    this.settings.set(merged);
    return merged;
  }

  /**
   * Generates next sequential document number e.g. INV-2026-1002
   */
  async getNextDocumentNumber(docType: string): Promise<string> {
    const s = await this.loadSettings();
    const config = getDocConfig(docType);
    const prefixConfig = s.prefixes[docType] || {
      prefix: config.defaultPrefix,
      nextNumber: 1001,
      padding: 4
    };

    const year = new Date().getFullYear();
    const padded = String(prefixConfig.nextNumber).padStart(prefixConfig.padding, '0');
    return `${prefixConfig.prefix}-${year}-${padded}`;
  }

  /**
   * Increments and saves sequential document number
   */
  async incrementDocumentNumber(docType: string): Promise<void> {
    const s = await this.loadSettings();
    const config = getDocConfig(docType);
    const prefixConfig = s.prefixes[docType] || {
      prefix: config.defaultPrefix,
      nextNumber: 1001,
      padding: 4
    };

    s.prefixes[docType] = {
      ...prefixConfig,
      nextNumber: prefixConfig.nextNumber + 1
    };

    await this.updateSettings({ prefixes: s.prefixes });
  }

  /**
   * Export all user data as JSON
   */
  async exportFullDatabase(): Promise<string> {
    const [settings, documents, clients, products, posSessions, posSales, ledgerEntries] = await Promise.all([
      db.settings.toArray(),
      db.documents.toArray(),
      db.clients.toArray(),
      db.products.toArray(),
      db.posSessions.toArray(),
      db.posSales.toArray(),
      db.ledgerEntries.toArray()
    ]);

    const backup = {
      app: 'x-facture',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        documents,
        clients,
        products,
        posSessions,
        posSales,
        ledgerEntries
      }
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import all user data from JSON
   */
  async importFullDatabase(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) throw new Error('Invalid backup file');

      await db.transaction('rw', [db.settings, db.documents, db.clients, db.products, db.posSessions, db.posSales, db.ledgerEntries], async () => {
        if (parsed.data.settings?.length) await db.settings.bulkPut(parsed.data.settings);
        if (parsed.data.documents?.length) await db.documents.bulkPut(parsed.data.documents);
        if (parsed.data.clients?.length) await db.clients.bulkPut(parsed.data.clients);
        if (parsed.data.products?.length) await db.products.bulkPut(parsed.data.products);
        if (parsed.data.posSessions?.length) await db.posSessions.bulkPut(parsed.data.posSessions);
        if (parsed.data.posSales?.length) await db.posSales.bulkPut(parsed.data.posSales);
        if (parsed.data.ledgerEntries?.length) await db.ledgerEntries.bulkPut(parsed.data.ledgerEntries);
      });

      await this.loadSettings();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}
