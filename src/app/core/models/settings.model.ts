import { DocumentParty } from './document.model';

export interface NumberingPrefixConfig {
  prefix: string;
  nextNumber: number;
  padding: number;
}

export interface BusinessProfileSettings {
  id: string; // 'current'
  company: DocumentParty;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: string;
  defaultFormalTemplate: 'modern' | 'classic' | 'bold';
  defaultReceiptTemplate: 'thermal-80mm' | 'thermal-58mm' | 'modern';
  paperSize: 'a4' | 'letter';
  prefixes: Record<string, NumberingPrefixConfig>;
  updatedAt: string;
  
  // Extended customization parameters
  taxName?: string;                   // e.g. 'VAT', 'Sales Tax', 'GST'
  taxInclusive?: boolean;             // whether default prices include tax
  defaultNotes?: string;              // footer terms & disclaimer
  brandColor?: string;                // primary accent hex code e.g. '#059669'
  signatoryName?: string;             // authorized signatory name e.g. 'John Doe'
  signatoryTitle?: string;            // signatory title e.g. 'Managing Director'
  signatureUrl?: string;              // optional base64 signature image
  acceptedPaymentMethods?: string[];  // e.g. ['bank_transfer', 'credit_card', 'paypal', 'cash']
  posAutoPrint?: boolean;             // auto print receipt on POS checkout
  posSoundEffects?: boolean;          // audio beep feedback on POS scanner
}
