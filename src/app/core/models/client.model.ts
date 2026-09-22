export interface Client {
  id: string;
  slug: string;            // e.g. acme-corporation
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  defaultCurrency?: string;
  defaultTaxRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
