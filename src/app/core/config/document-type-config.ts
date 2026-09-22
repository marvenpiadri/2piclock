import { DocumentTypeConfig } from '../models/document-type-config.model';

export const DOCUMENT_TYPE_CONFIGS: Record<string, DocumentTypeConfig> = {
  'invoices': {
    docType: 'invoices',
    singularName: 'Tax Invoice',
    pluralName: 'Tax Invoices',
    routeSegment: 'invoices',
    defaultPrefix: 'INV',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Formal legally compliant tax invoice with itemized breakdown, tax rates, and payment remittance instructions.',
    icon: 'receipt_long'
  },
  'proforma-invoices': {
    docType: 'proforma-invoices',
    singularName: 'Proforma Invoice',
    pluralName: 'Proforma Invoices',
    routeSegment: 'proforma-invoices',
    defaultPrefix: 'PRO',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Preliminary bill of sale sent to buyers in advance of a shipment or delivery of goods.',
    icon: 'request_quote'
  },
  'commercial-invoices': {
    docType: 'commercial-invoices',
    singularName: 'Commercial Invoice',
    pluralName: 'Commercial Invoices',
    routeSegment: 'commercial-invoices',
    defaultPrefix: 'COM',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'classic',
    description: 'Customs declaration document for cross-border freight, tariffs, trade origin, and cargo clearance.',
    icon: 'local_shipping'
  },
  'quotes': {
    docType: 'quotes',
    singularName: 'Quote / Estimate',
    pluralName: 'Quotes & Estimates',
    routeSegment: 'quotes',
    defaultPrefix: 'QUO',
    defaultLineLayoutMode: 'flatRate',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Formal commercial price proposal and scope-of-work bid for client approval.',
    icon: 'calculate'
  },
  'purchase-orders': {
    docType: 'purchase-orders',
    singularName: 'Purchase Order',
    pluralName: 'Purchase Orders',
    routeSegment: 'purchase-orders',
    defaultPrefix: 'PO',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'classic',
    description: 'Legally binding buyer-generated authorization issued to an external supplier/vendor.',
    icon: 'shopping_bag'
  },
  'receipts': {
    docType: 'receipts',
    singularName: 'Sales Receipt',
    pluralName: 'Sales Receipts',
    routeSegment: 'receipts',
    defaultPrefix: 'RCT',
    defaultLineLayoutMode: 'flatRate',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Proof-of-payment document documenting settled retail or counter transactions.',
    icon: 'receipt'
  },
  'credit-notes': {
    docType: 'credit-notes',
    singularName: 'Credit Note / Memo',
    pluralName: 'Credit Notes',
    routeSegment: 'credit-notes',
    defaultPrefix: 'CRN',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Accounting instrument issued to a client reducing invoice liabilities or documenting returned merchandise.',
    icon: 'assignment_return'
  },
  'delivery-notes': {
    docType: 'delivery-notes',
    singularName: 'Delivery Note / Packing Slip',
    pluralName: 'Delivery Notes',
    routeSegment: 'delivery-notes',
    defaultPrefix: 'DLV',
    defaultLineLayoutMode: 'quantity',
    lockLineLayoutMode: true,
    hasPricing: false, // Explicitly no pricing shown on delivery note
    defaultTemplateId: 'classic',
    description: 'Warehouse goods manifest and logistics delivery packing slip without financial valuation.',
    icon: 'inventory'
  },
  'timesheet-invoices': {
    docType: 'timesheet-invoices',
    singularName: 'Timesheet Invoice',
    pluralName: 'Timesheet Invoices',
    routeSegment: 'timesheet-invoices',
    defaultPrefix: 'TSH',
    defaultLineLayoutMode: 'hours',
    hasPricing: true,
    defaultTemplateId: 'modern',
    description: 'Billable services invoice calculating hourly labor rates, hours rendered, and staff contractor logs.',
    icon: 'schedule'
  },
  'work-orders': {
    docType: 'work-orders',
    singularName: 'Work Order / Job Ticket',
    pluralName: 'Work Orders',
    routeSegment: 'work-orders',
    defaultPrefix: 'WO',
    defaultLineLayoutMode: 'hours',
    hasPricing: true,
    defaultTemplateId: 'bold',
    description: 'Operational work authorization, maintenance job ticket, or technician dispatch schedule.',
    icon: 'engineering'
  },
  'statements': {
    docType: 'statements',
    singularName: 'Statement of Account',
    pluralName: 'Statements of Account',
    routeSegment: 'statements',
    defaultPrefix: 'STMT',
    defaultLineLayoutMode: 'flatRate',
    hasPricing: true,
    defaultTemplateId: 'classic',
    isSpecialized: true,
    description: 'Running chronological ledger of all customer debits, credits, payments, and outstanding balance.',
    icon: 'account_balance'
  },
  'service-agreements': {
    docType: 'service-agreements',
    singularName: 'Service Agreement / Contract',
    pluralName: 'Service Agreements',
    routeSegment: 'service-agreements',
    defaultPrefix: 'SA',
    defaultLineLayoutMode: 'hours',
    hasPricing: true,
    defaultTemplateId: 'classic',
    description: 'Formal commercial consulting terms, SLA deliverables, hourly rates, and signatory agreement.',
    icon: 'handshake'
  },
  'retainer-invoices': {
    docType: 'retainer-invoices',
    singularName: 'Retainer Invoice',
    pluralName: 'Retainer Invoices',
    routeSegment: 'retainer-invoices',
    defaultPrefix: 'RET',
    defaultLineLayoutMode: 'flatRate',
    hasPricing: true,
    defaultTemplateId: 'bold',
    description: 'Advance deposit or recurring monthly retainer billing for ongoing advisory or priority capacity.',
    icon: 'lock_clock'
  },
  'bills-of-lading': {
    docType: 'bills-of-lading',
    singularName: 'Bill of Lading',
    pluralName: 'Bills of Lading',
    routeSegment: 'bills-of-lading',
    defaultPrefix: 'BOL',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'classic',
    isSpecialized: true,
    description: 'Maritime, air freight, or ground freight legal carrier contract and multimodal receipt for cargo.',
    icon: 'directions_boat'
  },
  'custom-documents': {
    docType: 'custom-documents',
    singularName: 'Custom Document',
    pluralName: 'Custom Documents',
    routeSegment: 'custom-documents',
    defaultPrefix: 'DOC',
    defaultLineLayoutMode: 'quantity',
    hasPricing: true,
    defaultTemplateId: 'modern',
    isSpecialized: true,
    description: 'Freeform multi-purpose business document with configurable line layout and custom fields.',
    icon: 'description'
  }
};

export const ALL_DOCUMENT_TYPES: DocumentTypeConfig[] = Object.values(DOCUMENT_TYPE_CONFIGS);

export function getDocConfig(docType: string): DocumentTypeConfig {
  const normalized = docType.toLowerCase();
  return DOCUMENT_TYPE_CONFIGS[normalized] || DOCUMENT_TYPE_CONFIGS['invoices'];
}
