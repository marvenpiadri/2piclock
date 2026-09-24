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
    const currentPath = (this.router.url || '/').split('?')[0];
    const url = this.normalizeUrl(data.url || `${this.siteUrl}${currentPath}`);
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
    const path = url.split('?')[0].replace(/\/$/, '') || '/';

    const pages: Record<string, SeoMetadata> = {
      '/': {
        title: '2PiClock — Astronomical World Clock & Living Sky',
        description: this.defaultDescription
      },
      '/sky': {
        title: '2PiClock — Astronomical World Clock & Living Sky',
        description: this.defaultDescription
      },
      '/sky/weather': {
        title: 'Sky & Weather Telemetry — 2PiClock',
        description: 'Real-time atmospheric telemetry, humidity, cloud cover, and solar altitude atop your sky horizon.'
      },
      '/sky/astronomy': {
        title: 'Sky & Astronomy Ephemeris — 2PiClock',
        description: 'High precision solar, lunar, and twilight boundary ephemeris synchronized with your local horizon.'
      },
      '/sky/world': {
        title: 'Sky & World Observatory — 2PiClock',
        description: 'Real-time multi-timezone clocks and global celestial positions.'
      },
      '/world': {
        title: '2PiClock Earth Observatory — NASA Scientific 2D Projection',
        description: 'Continuous analytical 2D solar terminator, 4-stage twilight gradients, subsolar zenith, and timezone grid.'
      },
      '/world-clocks': {
        title: 'World Clocks — 2PiClock',
        description: 'Compare local time, solar altitude, sunrise, sunset, twilight, and the global day-night boundary across cities.'
      },
      '/weather': {
        title: 'Windy Meteorological Map & Live Streamlines — 2PiClock',
        description: 'State-of-the-art interactive weather radar, high-density fluid wind streamlines, altitude pressure levels, and 72-hour meteogram.'
      },
      '/ephemeris': {
        title: 'Solar Ephemeris — 2PiClock',
        description: 'Explore solar altitude, azimuth, seasonal motion, twilight, and the daily Sun trajectory for a selected location.'
      },
      '/atmosphere': {
        title: 'Atmosphere Studio — 2PiClock',
        description: 'See how live weather conditions interact with solar and lunar geometry to shape the 2PiClock atmosphere.'
      },
      '/space': {
        title: '3D Celestial Sphere & Keplerian Ephemeris Engine | 2piClock',
        description: 'Explore the night sky from any global coordinate vector. Track local horizons, the ecliptic plane, and solar system trajectories using a reactive 3D mathematical space engine.'
      },
      '/deep-space-observatory': {
        title: '3D Celestial Sphere & Keplerian Ephemeris Engine | 2piClock',
        description: 'Explore the night sky from any global coordinate vector. Track local horizons, the ecliptic plane, and solar system trajectories using a reactive 3D mathematical space engine.'
      },
      '/planner': {
        title: 'Golden Hour & Multi-Timezone Meeting Planner — 2PiClock',
        description: 'Synchronized multi-location overlap calculator, optimum daylight alignment, and working hour windows.'
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
