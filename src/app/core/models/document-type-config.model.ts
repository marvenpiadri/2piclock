import { LineLayoutMode } from './document.model';

export interface DocumentTypeConfig {
  docType: string;              // 'invoices', 'quotes', 'purchase-orders', etc.
  singularName: string;         // 'Tax Invoice'
  pluralName: string;           // 'Tax Invoices'
  routeSegment: string;         // 'invoices'
  defaultPrefix: string;        // 'INV'
  defaultLineLayoutMode: LineLayoutMode;
  lockLineLayoutMode?: boolean; // e.g. true for Delivery Note
  hasPricing: boolean;          // false for Delivery Note
  defaultTemplateId: string;
  isSpecialized?: boolean;      // true for statements, bills-of-lading, custom-documents
  description: string;
  icon: string;                 // Material icon name
}
