import { Injectable } from '@angular/core';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  readonly CURRENCIES: CurrencyConfig[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
    { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
    { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
    { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', decimals: 2 },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
    { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', decimals: 2 },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
    { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', decimals: 2 },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 }
  ];

  getCurrency(code?: string): CurrencyConfig {
    if (!code) return this.CURRENCIES[0];
    const normalized = code.toUpperCase();
    return this.CURRENCIES.find(c => c.code === normalized) || {
      code: normalized,
      symbol: normalized,
      name: normalized,
      decimals: 2
    };
  }

  getSymbol(code?: string): string {
    return this.getCurrency(code).symbol;
  }

  /**
   * Single authoritative currency formatter for the entire app.
   */
  format(amount: number | undefined | null, currencyCode = 'USD'): string {
    const val = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
    const curr = this.getCurrency(currencyCode);

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr.code,
        minimumFractionDigits: curr.decimals,
        maximumFractionDigits: curr.decimals
      }).format(val);
    } catch {
      return `${curr.symbol}${val.toFixed(curr.decimals)}`;
    }
  }

  /**
   * Format number only with decimals, without symbol
   */
  formatNumber(amount: number | undefined | null, decimals = 2): string {
    const val = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  }
}
