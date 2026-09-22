import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CalculatorDefinition, getCalculatorBySlug } from '../../calculators/calculator-registry';
import { DOCUMENT_TYPE_CONFIGS } from '../config/document-type-config';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  robots?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly siteUrl = 'https://x-facture.com';
  private readonly siteName = 'X-Facture';
  private readonly defaultImage = `${this.siteUrl}/x-facture-LOGO-PFP.png`;

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateForUrl(event.urlAfterRedirects));
    this.updateForUrl(this.router.url || '/');
  }

  updateMetadata(data: SeoMetadata): void {
    const url = this.normalizeUrl(data.url || `${this.siteUrl}${this.document.location.pathname}`);
    const image = data.image || this.defaultImage;
    const robots = data.robots || 'index, follow';

    this.titleService.setTitle(data.title);
    this.metaService.updateTag({ name: 'description', content: data.description });
    this.metaService.updateTag({ name: 'robots', content: robots });
    this.metaService.updateTag({ name: 'googlebot', content: robots });
    if (data.keywords) this.metaService.updateTag({ name: 'keywords', content: data.keywords });
    else this.metaService.removeTag('name="keywords"');

    this.metaService.updateTag({ property: 'og:title', content: data.title });
    this.metaService.updateTag({ property: 'og:description', content: data.description });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: data.type || 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: data.title });
    this.metaService.updateTag({ name: 'twitter:description', content: data.description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
    this.updateCanonicalLink(url);
  }

  updateCalculatorMetadata(calculator: CalculatorDefinition): void {
    const url = `${this.siteUrl}/calculators/${calculator.slug}`;
    this.updateMetadata({ title: calculator.title, description: calculator.description, keywords: calculator.keywords.join(', '), url, type: 'website' });

    this.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        this.organizationSchema(),
        {
          '@type': 'WebApplication',
          '@id': `${url}#calculator`,
          name: calculator.name,
          url,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          isAccessibleForFree: true,
          description: calculator.description,
          keywords: calculator.keywords.join(', '),
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          provider: { '@id': `${this.siteUrl}#organization` }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'X-Facture', item: this.siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Business Calculators', item: `${this.siteUrl}/calculators` },
            { '@type': 'ListItem', position: 3, name: calculator.name, item: url }
          ]
        }
      ]
    });
  }

  updateCalculatorMetadataBySlug(slug: string): void {
    const calculator = getCalculatorBySlug(slug);
    if (calculator) this.updateCalculatorMetadata(calculator);
  }

  private updateForUrl(rawUrl: string): void {
    const path = rawUrl.split('?')[0].split('#')[0] || '/';
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'calculators' && segments[1]) {
      const calculator = getCalculatorBySlug(segments[1]);
      if (calculator) {
        this.updateCalculatorMetadata(calculator);
        return;
      }
    }

    if (segments[0] === 'calculators') {
      this.updateMetadata({
        title: 'Business Calculators & Financial Tools | X-Facture',
        description: 'Free business calculators for pricing, margins, taxes, payments, loans, cash flow, inventory, marketing and everyday financial decisions.',
        keywords: 'business calculators, financial calculators, pricing calculator, profit calculator, cash flow calculator, tax calculator, loan calculator, invoice calculator',
        url: `${this.siteUrl}/calculators`
      });
      this.setSiteSchema(`${this.siteUrl}/calculators`, 'Business Calculators & Financial Tools');
      return;
    }

    const docType = segments[0];
    const docConfig = docType ? DOCUMENT_TYPE_CONFIGS[docType] : undefined;
    if (docConfig && segments.length === 1) {
      const url = `${this.siteUrl}/${docConfig.routeSegment}`;
      this.updateMetadata({
        title: `${docConfig.pluralName} — Free Business Documents | X-Facture`,
        description: `${docConfig.description} Create and manage ${docConfig.pluralName.toLowerCase()} with X-Facture's free business document tools.`,
        keywords: `${docConfig.pluralName.toLowerCase()}, ${docConfig.singularName.toLowerCase()}, business documents, invoicing, free business tools`,
        url
      });
      this.setSiteSchema(url, docConfig.pluralName);
      return;
    }

    const routeSeo: Record<string, SeoMetadata> = {
      '/': { title: 'X-Facture — Free Business Tools, Financial Calculators & Invoicing', description: 'Free business tools for entrepreneurs and companies: invoicing, receipts, POS, financial calculators, cash-flow tools, pricing, taxes and business records.', keywords: 'business tools, financial calculators, invoice generator, free invoicing, POS, business finance, pricing tools, cash flow, tax calculator', url: this.siteUrl },
      '/home': { title: 'X-Facture — Business Finance & Invoicing Tools', description: 'Practical free business tools for invoicing, POS, financial calculations, pricing, taxes and everyday business operations.', url: `${this.siteUrl}/home`, robots: 'noindex, follow' },
      '/dashboard': { title: 'Business Dashboard | X-Facture', description: 'Business dashboard for monitoring sales, transactions, records and operating activity in X-Facture.', url: `${this.siteUrl}/dashboard`, robots: 'noindex, nofollow' },
      '/store/pos': { title: 'Free POS & Cash Register | X-Facture', description: 'Practical point-of-sale and cash register tools for retail transactions, checkout and change calculation.', keywords: 'free POS, cash register, point of sale, retail POS, checkout software', url: `${this.siteUrl}/store/pos` },
      '/ledger': { title: 'Business Financial Ledger | X-Facture', description: 'Track business revenue, expenses and payment records with X-Facture’s practical financial ledger.', keywords: 'business ledger, financial ledger, income expense tracker, payment ledger', url: `${this.siteUrl}/ledger` },
      '/clients': { title: 'Client Directory & CRM | X-Facture', description: 'Organize customer accounts, billing contacts and client information for everyday business operations.', keywords: 'client management, CRM, customer directory, billing contacts', url: `${this.siteUrl}/clients` },
      '/products': { title: 'Products & Services Catalog | X-Facture', description: 'Manage products, services, pricing, SKUs and inventory information for your business.', keywords: 'product catalog, service catalog, SKU management, inventory, business products', url: `${this.siteUrl}/products` },
      '/settings': { title: 'Company & Business Settings | X-Facture', description: 'Configure company details, tax settings, currency and business preferences in X-Facture.', url: `${this.siteUrl}/settings`, robots: 'noindex, nofollow' }
    };

    const metadata = routeSeo[path] ?? {
      title: 'X-Facture — Free Business Tools',
      description: 'Practical free business tools for invoicing, finance, pricing, taxes, payments and operations.',
      url: `${this.siteUrl}${path}`,
      robots: 'noindex, nofollow'
    };
    this.updateMetadata(metadata);
    if (path === '/') this.setHomepageSchema();
    else this.setSiteSchema(metadata.url || this.siteUrl, metadata.title);
  }

  private setHomepageSchema(): void {
    this.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        this.organizationSchema(),
        { '@type': 'WebSite', '@id': `${this.siteUrl}#website`, name: this.siteName, url: this.siteUrl, publisher: { '@id': `${this.siteUrl}#organization` } },
        { '@type': 'WebPage', '@id': `${this.siteUrl}#webpage`, name: 'X-Facture — Free Business Tools, Financial Calculators & Invoicing', url: this.siteUrl, isPartOf: { '@id': `${this.siteUrl}#website` }, about: { '@id': `${this.siteUrl}#organization` } }
      ]
    });
  }

  private organizationSchema(): Record<string, unknown> {
    return { '@type': 'Organization', '@id': `${this.siteUrl}#organization`, name: this.siteName, url: this.siteUrl, logo: `${this.siteUrl}/x-facture-LOGO-PFP.png` };
  }

  private setSiteSchema(url: string, pageName: string): void {
    this.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        this.organizationSchema(),
        { '@type': 'WebSite', '@id': `${this.siteUrl}#website`, name: this.siteName, url: this.siteUrl, publisher: { '@id': `${this.siteUrl}#organization` } },
        { '@type': 'WebPage', '@id': `${url}#webpage`, name: pageName, url, isPartOf: { '@id': `${this.siteUrl}#website` }, about: { '@id': `${this.siteUrl}#organization` } },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'X-Facture', item: this.siteUrl }, { '@type': 'ListItem', position: 2, name: pageName, item: url }] }
      ]
    });
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url, this.siteUrl);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().replace(/\/$/, '') || this.siteUrl;
    } catch { return url; }
  }

  private updateCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', url);
    else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  setJsonLd(data: unknown): void {
    let script = this.document.querySelector('script[type="application/ld+json"]#dynamic-json-ld');
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'dynamic-json-ld');
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }
}
