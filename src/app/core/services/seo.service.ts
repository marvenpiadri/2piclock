import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoMetadata {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
  robots?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly siteUrl = 'https://2piclock.com';
  private readonly siteName = '2PiClock';
  private readonly defaultDescription =
    '2PiClock is a living astronomical world clock that connects exact time, global locations, Sun and Moon geometry, twilight, seasons, and live weather.';
  private readonly defaultImage = `${this.siteUrl}/favicon.ico`;

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateForUrl(event.urlAfterRedirects));

    this.updateForUrl(this.router.url || '/');
  }

  updateMetadata(data: SeoMetadata): void {
    const url = this.normalizeUrl(data.url || `${this.siteUrl}${this.document.location.pathname}`);
    const description = data.description || this.defaultDescription;
    const image = data.image || this.defaultImage;
    const robots = data.robots || 'index, follow';

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ name: 'googlebot', content: robots });

    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: data.type || 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.updateCanonicalLink(url);
  }

  private updateForUrl(url: string): void {
    const path = url.split('?')[0].replace(/\\/$/, '') || '/';

    const pages: Record<string, SeoMetadata> = {
      '/': {
        title: '2PiClock — Astronomical World Clock & Living Sky',
        description: this.defaultDescription
      },
      '/world-clocks': {
        title: 'World Clocks — 2PiClock',
        description: 'Compare local time, solar altitude, sunrise, sunset, twilight, and the global day-night boundary across cities.'
      },
      '/ephemeris': {
        title: 'Solar Ephemeris — 2PiClock',
        description: 'Explore solar altitude, azimuth, seasonal motion, twilight, and the daily Sun trajectory for a selected location.'
      },
      '/atmosphere': {
        title: 'Atmosphere Studio — 2PiClock',
        description: 'See how live weather conditions interact with solar and lunar geometry to shape the 2PiClock atmosphere.'
      }
    };

    this.updateMetadata(pages[path] || {
      title: '2PiClock — Time, Sky & Atmosphere',
      description: this.defaultDescription
    });
  }

  private normalizeUrl(url: string): string {
    return url.replace(/([^:]\/)\/+/g, '$1');
  }

  private updateCanonicalLink(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
