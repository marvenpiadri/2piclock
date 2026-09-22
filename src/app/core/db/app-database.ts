import Dexie, { Table } from 'dexie';
import { BusinessDocument } from '../models/document.model';
import { Client } from '../models/client.model';
import { Product } from '../models/product.model';
import { RegisterSession, PosSale } from '../models/pos.model';
import { LedgerEntry } from '../models/ledger.model';
import { BusinessProfileSettings } from '../models/settings.model';

export class AppDatabase extends Dexie {
  documents!: Table<BusinessDocument, string>;
  clients!: Table<Client, string>;
  products!: Table<Product, string>;
  posSessions!: Table<RegisterSession, string>;
  posSales!: Table<PosSale, string>;
  ledgerEntries!: Table<LedgerEntry, string>;
  settings!: Table<BusinessProfileSettings, string>;

  constructor() {
    super('XFactureBusinessDB');

    // Schema definition — version 1
    this.version(1).stores({
      documents: 'id, docNumber, slug, docType, status, issueDate, dueDate, clientId, createdAt, updatedAt',
      clients: 'id, slug, name, email, companyName, createdAt',
      products: 'id, slug, sku, name, category, isArchived, createdAt',
      posSessions: 'id, sessionNumber, status, openedAt, closedAt',
      posSales: 'id, receiptNumber, sessionId, date, docId',
      ledgerEntries: 'id, date, type, category, docId, docNumber, status, createdAt',
      settings: 'id'
    });
  }
}

export const db = new AppDatabase();

/**
 * Seed initial sample business data if DB is empty
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  try {
    const existingSettings = await db.settings.get('current');
    if (existingSettings) return;

    // 1. Initial Business Settings
    const defaultSettings: BusinessProfileSettings = {
      id: 'current',
      company: {
        name: 'x-facture Studio SARL',
        legalName: 'x-facture Studio SARL',
        email: 'billing@x-facture.com',
        phone: '+1 (555) 234-8900',
        address: '100 Innovation Boulevard, Suite 400',
        city: 'San Francisco',
        postalCode: '94107',
        country: 'United States',
        taxId: 'US-94-3829104',
        logoUrl: '',
        bankDetails: 'Bank: Silicon Horizon Bank\nRouting (ABA): 121000358\nAccount: 4892019482\nSWIFT: SHBKUS6S\nIBAN: US44SHBK1210003584892019482'
      },
      defaultCurrency: 'USD',
      defaultTaxRate: 10,
      defaultPaymentTerms: 'Payment due within 30 days of invoice date. Late payments accrue 1.5% interest per month.',
      defaultFormalTemplate: 'modern',
      defaultReceiptTemplate: 'thermal-80mm',
      paperSize: 'a4',
      prefixes: {
        'invoices': { prefix: 'INV', nextNumber: 1001, padding: 4 },
        'proforma-invoices': { prefix: 'PRO', nextNumber: 101, padding: 4 },
        'commercial-invoices': { prefix: 'COM', nextNumber: 201, padding: 4 },
        'quotes': { prefix: 'QUO', nextNumber: 501, padding: 4 },
        'purchase-orders': { prefix: 'PO', nextNumber: 301, padding: 4 },
        'receipts': { prefix: 'RCT', nextNumber: 2001, padding: 4 },
        'credit-notes': { prefix: 'CRN', nextNumber: 101, padding: 4 },
        'delivery-notes': { prefix: 'DLV', nextNumber: 401, padding: 4 },
        'timesheet-invoices': { prefix: 'TSH', nextNumber: 101, padding: 4 },
        'work-orders': { prefix: 'WO', nextNumber: 101, padding: 4 },
        'statements': { prefix: 'STMT', nextNumber: 101, padding: 4 },
        'service-agreements': { prefix: 'SA', nextNumber: 101, padding: 4 },
        'retainer-invoices': { prefix: 'RET', nextNumber: 101, padding: 4 },
        'bills-of-lading': { prefix: 'BOL', nextNumber: 101, padding: 4 },
        'custom-documents': { prefix: 'DOC', nextNumber: 101, padding: 4 }
      },
      updatedAt: new Date().toISOString()
    };
    await db.settings.put(defaultSettings);

    // 2. Initial Sample Clients
    const sampleClients: Client[] = [
      {
        id: 'client-acme',
        slug: 'acme-technologies',
        name: 'Jane Doe',
        companyName: 'Acme Technologies Inc.',
        email: 'accounts@acme-tech.io',
        phone: '+1 (415) 890-1200',
        address: '742 Evergreen Terrace',
        city: 'Seattle',
        postalCode: '98101',
        country: 'United States',
        taxId: 'US-82-990142',
        defaultCurrency: 'USD',
        defaultTaxRate: 10,
        notes: 'Enterprise account with Net-30 terms. Preferred payment via ACH/wire.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'client-lumina',
        slug: 'lumina-creative',
        name: 'Marcus Vance',
        companyName: 'Lumina Creative Studio',
        email: 'marcus@luminastudio.design',
        phone: '+1 (310) 450-8821',
        address: '420 Venice Boulevard',
        city: 'Los Angeles',
        postalCode: '90291',
        country: 'United States',
        taxId: 'US-95-102948',
        defaultCurrency: 'USD',
        defaultTaxRate: 10,
        notes: 'Monthly design & brand retainer client.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'client-globex',
        slug: 'globex-logistics',
        name: 'Elena Rostova',
        companyName: 'Globex Logistics Global',
        email: 'freight@globexlogistics.com',
        phone: '+44 20 7946 0912',
        address: '14 Canary Wharf, Floor 22',
        city: 'London',
        postalCode: 'E14 5AB',
        country: 'United Kingdom',
        taxId: 'GB-992019401',
        defaultCurrency: 'GBP',
        defaultTaxRate: 20,
        notes: 'Cross-border cargo partner requiring Commercial Invoices & Bills of Lading.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    await db.clients.bulkPut(sampleClients);

    // 3. Initial Sample Products (for documents & POS register)
    const sampleProducts: Product[] = [
      {
        id: 'prod-consult-dev',
        slug: 'senior-software-engineering',
        sku: 'SRV-ENG-01',
        name: 'Senior Engineering Consulting',
        description: 'Full-stack architecture, API design, and system optimization.',
        unitCost: 150.00,
        taxRate: 10,
        category: 'Services',
        icon: 'code',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-ui-design',
        slug: 'ui-ux-design-sprint',
        sku: 'SRV-DSG-02',
        name: 'UI/UX Design Sprint',
        description: 'Interactive high-fidelity wireframing, typography, and design tokens.',
        unitCost: 120.00,
        taxRate: 10,
        category: 'Services',
        icon: 'palette',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-hardware-terminal',
        slug: 'pos-receipt-terminal-dock',
        sku: 'HW-POS-58',
        name: 'Thermal Receipt Printer Roll (80mm)',
        description: 'BPA-free high-sensitivity thermal paper rolls, box of 20.',
        unitCost: 45.00,
        taxRate: 10,
        category: 'Hardware',
        icon: 'print',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-retainer-tier1',
        slug: 'monthly-advisory-retainer',
        sku: 'RET-ADV-01',
        name: 'Priority Advisory Retainer',
        description: 'Monthly dedicated capacity, quarterly reviews, and SLA guarantee.',
        unitCost: 2500.00,
        taxRate: 0,
        category: 'Services',
        icon: 'support_agent',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-retail-merch',
        slug: 'artisan-roast-coffee-beans',
        sku: 'RET-COF-01',
        name: 'Artisan Roast Coffee Blend (1kg)',
        description: 'Single-origin washed beans for counter retail display.',
        unitCost: 28.50,
        taxRate: 5,
        category: 'Retail',
        icon: 'local_cafe',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-store-tote',
        slug: 'canvas-shopper-tote',
        sku: 'RET-BAG-02',
        name: 'Organic Canvas Shopper Tote',
        description: 'Heavyweight unbleached organic cotton tote bag.',
        unitCost: 18.00,
        taxRate: 10,
        category: 'Retail',
        icon: 'shopping_bag',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    await db.products.bulkPut(sampleProducts);

    // 4. Initial Sample Documents
    const sampleInvoice: BusinessDocument = {
      id: 'doc-sample-inv-01',
      docNumber: 'INV-2026-1001',
      slug: 'inv-2026-1001',
      docType: 'invoices',
      docTypeLabel: 'Tax Invoice',
      title: 'Q1 Cloud Platform Migration & Architecture',
      status: 'paid',
      currency: 'USD',
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      purchaseOrderRef: 'PO-ACM-9801',
      company: defaultSettings.company,
      client: {
        name: 'Jane Doe',
        legalName: 'Acme Technologies Inc.',
        email: 'accounts@acme-tech.io',
        address: '742 Evergreen Terrace',
        city: 'Seattle',
        postalCode: '98101',
        country: 'United States',
        taxId: 'US-82-990142'
      },
      clientId: 'client-acme',
      lineLayoutMode: 'quantity',
      templateId: 'modern',
      paperSize: 'a4',
      hasPricing: true,
      items: [
        {
          id: 'item-1',
          description: 'Senior Engineering Consulting — Architecture sprint',
          quantity: 20,
          unitCost: 150.00,
          taxRate: 10,
          discountPercent: 0,
          amount: 3000.00
        },
        {
          id: 'item-2',
          description: 'UI/UX Design Sprint — Design tokens & system review',
          quantity: 10,
          unitCost: 120.00,
          taxRate: 10,
          discountPercent: 5,
          amount: 1140.00
        }
      ],
      subtotal: 4140.00,
      taxRate: 10,
      taxAmount: 414.00,
      discountAmount: 60.00,
      shippingAmount: 0,
      total: 4554.00,
      depositPaid: 4554.00,
      balanceDue: 0,
      notes: 'Thank you for your business. Payment received via Wire Transfer.',
      terms: defaultSettings.defaultPaymentTerms,
      bankDetails: defaultSettings.company.bankDetails,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-02T14:30:00Z'
    };

    const sampleQuote: BusinessDocument = {
      id: 'doc-sample-quo-01',
      docNumber: 'QUO-2026-0501',
      slug: 'quo-2026-0501',
      docType: 'quotes',
      docTypeLabel: 'Quote / Estimate',
      title: 'Brand Identity & Mobile UX Redesign',
      status: 'sent',
      currency: 'USD',
      issueDate: '2026-03-10',
      dueDate: '2026-04-10',
      company: defaultSettings.company,
      client: {
        name: 'Marcus Vance',
        legalName: 'Lumina Creative Studio',
        email: 'marcus@luminastudio.design',
        address: '420 Venice Boulevard',
        city: 'Los Angeles',
        postalCode: '90291',
        country: 'United States',
        taxId: 'US-95-102948'
      },
      clientId: 'client-lumina',
      lineLayoutMode: 'flatRate',
      templateId: 'modern',
      paperSize: 'a4',
      hasPricing: true,
      items: [
        {
          id: 'q-item-1',
          description: 'Comprehensive Brand Visual System & Token Architecture',
          quantity: 1,
          unitCost: 3500.00,
          taxRate: 10,
          discountPercent: 0,
          amount: 3500.00
        },
        {
          id: 'q-item-2',
          description: 'Component Library Implementation & Style Guide Delivery',
          quantity: 1,
          unitCost: 2200.00,
          taxRate: 10,
          discountPercent: 0,
          amount: 2200.00
        }
      ],
      subtotal: 5700.00,
      taxRate: 10,
      taxAmount: 570.00,
      discountAmount: 0,
      shippingAmount: 0,
      total: 6270.00,
      depositPaid: 0,
      balanceDue: 6270.00,
      notes: 'Estimate valid for 30 days from date of issue.',
      terms: '50% deposit required upon project commencement.',
      bankDetails: defaultSettings.company.bankDetails,
      createdAt: '2026-03-10T09:00:00Z',
      updatedAt: '2026-03-10T09:00:00Z'
    };

    await db.documents.bulkPut([sampleInvoice, sampleQuote]);

    // 5. Initial Ledger Entries (fed from paid invoice)
    const sampleLedgerEntries: LedgerEntry[] = [
      {
        id: 'ledg-sample-1',
        date: '2026-03-02',
        description: 'Payment for Invoice INV-2026-1001 (Acme Technologies)',
        category: 'Tax Invoice',
        type: 'income',
        amount: 4554.00,
        currency: 'USD',
        paymentMethod: 'Bank Wire',
        status: 'reconciled',
        docId: sampleInvoice.id,
        docNumber: sampleInvoice.docNumber,
        docType: sampleInvoice.docType,
        clientId: 'client-acme',
        clientName: 'Acme Technologies Inc.',
        runningBalance: 4554.00,
        createdAt: '2026-03-02T14:30:00Z'
      }
    ];
    await db.ledgerEntries.bulkPut(sampleLedgerEntries);

  } catch (error) {
    console.error('Failed to seed initial local database:', error);
  }
}
