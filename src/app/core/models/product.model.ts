export interface Product {
  id: string;
  slug: string;            // e.g. consulting-hour
  sku?: string;
  name: string;
  description?: string;
  unitCost: number;
  taxRate: number;         // percentage
  category?: string;       // e.g. 'Services', 'Retail', 'Digital', 'Beverages'
  icon?: string;           // material-icon name
  imageUrl?: string;       // image URL or base64 data string
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}
