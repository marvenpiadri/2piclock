import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveSkyComponent } from './shared/components/reactive-sky/reactive-sky';
import { DeepSpaceBackdropComponent } from './shared/components/deep-space-backdrop/deep-space-backdrop';
import { CountryFlagComponent, MiniRadioPlayerComponent } from './shared/components';
import { GlassThemeService } from './core/services/glass-theme.service';
import { LocationService } from './core/services/location.service';
import { CelestialService } from './core/services/celestial.service';
import { ObservatoryViewService, ObservatoryView } from './core/services/observatory-view.service';
import { GeoLocation } from './core/models/location.model';
import { GeocodingService } from './core/services/geocoding.service';
import { Subscription, filter } from 'rxjs';

export interface NavCategory {
  title: string;
  icon: string;
  items: {
    label: string;
    path?: string;
    view?: ObservatoryView;
    desc: string;
    icon: string;
    tag?: string;
  }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    MatIconModule, 
    ReactiveSkyComponent, 
    DeepSpaceBackdropComponent,
    CountryFlagComponent,
    MiniRadioPlayerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private locationService = inject(LocationService);
  private celestialService = inject(CelestialService);
  private geocodingService = inject(GeocodingService);
  private observatoryViewService = inject(ObservatoryViewService);
  readonly glassThemeService = inject(GlassThemeService);
  readonly router = inject(Router);

  readonly activeView = this.observatoryViewService.activeView;
  readonly selectedLocation = this.locationService.selectedLocation;
  readonly allLocations = this.locationService.allPresets;
  readonly isLocating = this.locationService.isLocating;
  readonly locationError = this.locationService.locationError;

  // Animated substrates are mounted only on experiences that actually use them.
  // This prevents the 60fps sky renderer from consuming CPU on calculators,
  // maps and other product routes.
  readonly currentRoute = signal<string>('/');
  readonly showReactiveSky = computed(() => {
    const url = this.currentRoute();
    return url === '/' || url === '/now' || url === '/weather' || url === '/tonight' || /^\/[a-z0-9-]+(?:\/(?:weather|time|tonight|sun|moon|astronomy))?(?:\?.*)?$/.test(url) || url.startsWith('/sky');
  });
  readonly showDeepSpace = computed(() => {
    const url = this.currentRoute();
    return url === '/space' || url.startsWith('/deep-space');
  });

  readonly localTime = this.celestialService.formattedLocalTime;
  readonly localDate = this.celestialService.formattedLocalDate;
  readonly celestial = this.celestialService.celestialState;

  constructor() {
    this.currentRoute.set(this.router.url || '/');
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        const url = (event as NavigationEnd).urlAfterRedirects || '/';
        this.currentRoute.set(url);
        this.updateCanonical(url);
      });
    this.updateCanonical(this.router.url || '/');
  }

  private updateCanonical(url: string): void {
    const cleanPath = url.split('?')[0] || '/';
    const canonicalUrl = 'https://2piclock.com' + (cleanPath === '/' ? '/' : cleanPath.replace(/\/$/, ''));
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }

  // Dropdown & sidebar collapse states
  showLocationDropdown = signal<boolean>(false);
  showNavMenu = signal<boolean>(false);
  isSearchFocused = signal<boolean>(false);
  isNavCollapsed = signal<boolean>(false);

  toggleNavCollapse(): void {
    this.isNavCollapsed.update(v => !v);
  }

  // Search filter for city picker
  searchQuery = signal<string>('');
  readonly remoteLocations = signal<GeoLocation[]>([]);
  readonly isRemoteSearching = signal(false);
  private remoteSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private remoteSearchSubscription: Subscription | null = null;

  // Categorized Navigation Directory
  readonly navCategories: NavCategory[] = [
    {
      title: 'Time Product Suite',
      icon: 'schedule',
      items: [
        {
          label: 'Time Zone Converter',
          path: '/time',
          desc: 'Multi-target timezone conversion with DST awareness, 12/24h formats, and date offsets.',
          icon: 'sync_alt',
          tag: 'Product'
        },
        {
          label: 'Time & Date Differences',
          path: '/time',
          desc: 'Precise time difference solver, calendar date arithmetic, and business days.',
          icon: 'compare_arrows'
        },
        {
          label: 'Countdowns & Unix Epoch',
          path: '/time',
          desc: 'Live high-precision target event countdowns, count-ups, and Unix timestamp engine.',
          icon: 'hourglass_bottom'
        }
      ]
    },
    {
      title: 'Celestial Horizons & Solar',
      icon: 'wb_sunny',
      items: [
        {
          label: 'Sky Window & 2Pi Dial',
          path: '/',
          view: 'sky',
          desc: 'Living horizon simulation, diurnal radian vector, and optical twilight gradient.',
          icon: 'radio_button_checked',
          tag: 'Real-Time'
        },
        {
          label: 'Solar & Daylight Calculator',
          path: '/astronomy',
          desc: 'Solar altitude/azimuth, golden hour, twilight boundaries, and solar noon.',
          icon: 'wb_twilight',
          tag: 'Tool'
        },
        {
          label: 'Lunar Phase & "When Is?"',
          path: '/astronomy',
          desc: 'Geometric Moon phase terminator, next lunar milestones, and astronomical events.',
          icon: 'nightlight_round'
        }
      ]
    },
    {
      title: 'Earth & Global Experience',
      icon: 'public',
      items: [
        {
          label: 'World Radio (Listen to Earth)',
          path: '/radio',
          desc: 'Live global terrestrial broadcasts synchronized with local solar & diurnal cycles.',
          icon: 'radio',
          tag: 'Radio'
        },
        {
          label: 'World Clocks Grid',
          path: '/world-clocks',
          desc: 'Live clocks across major cities and time zones.',
          icon: 'schedule',
          tag: 'Multi-City'
        },
        {
          label: 'World Map (Terminator)',
          path: '/world',
          desc: 'Continuous analytical 2D terminator curve, subsolar zenith, and timezone grid.',
          icon: 'public'
        },
        {
          label: 'Meeting & Overlap Planner',
          path: '/planner',
          desc: 'Synchronized multi-location overlap calculator and optimum meeting planner.',
          icon: 'event_available'
        }
      ]
    },
    {
      title: 'Astronomy & Space',
      icon: 'flare',
      items: [
        {
          label: 'Deep Space Orrery (3D)',
          path: '/space',
          view: 'space',
          desc: '3D Celestial Sphere, Right Ascension / Declination, and Keplerian orbital paths.',
          icon: 'view_in_ar',
          tag: '3D'
        },
        {
          label: 'Astronomical Ephemeris',
          path: '/ephemeris',
          desc: 'High-precision solar, lunar, and planetary coordinates with equation of time.',
          icon: 'dataset'
        }
      ]
    },
    {
      title: 'Atmosphere & Weather',
      icon: 'air',
      items: [
        {
          label: 'Atmosphere & Storm Severity',
          path: '/atmosphere',
          desc: 'Weather Aggressiveness Index, winter frost, barometric pressure, and visibility.',
          icon: 'thunderstorm'
        },
        {
          label: 'Wind & Weather Map',
          path: '/weather',
          desc: 'Global meteorological maps and live weather observations.',
          icon: 'air'
        }
      ]
    }
  ];

  readonly filteredLocations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allLocations;
    return this.allLocations.filter(
      l => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q)
    );
  });

  toggleLocationDropdown(): void {
    this.showLocationDropdown.update(v => !v);
    if (this.showLocationDropdown()) {
      this.showNavMenu.set(false);
    }
  }

  toggleNavMenu(): void {
    this.showNavMenu.update(v => !v);
    if (this.showNavMenu()) {
      this.showLocationDropdown.set(false);
    }
  }

  closeMenus(): void {
    if (this.remoteSearchTimer) clearTimeout(this.remoteSearchTimer);
    this.showLocationDropdown.set(false);
    this.showNavMenu.set(false);
    this.isSearchFocused.set(false);
  }

  navigateMenu(item: { path?: string; view?: ObservatoryView }): void {
    if (item.view) {
      this.observatoryViewService.setView(item.view);
    }
    if (item.path) {
      this.router.navigate([item.path]);
    }
    this.closeMenus();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.searchRemoteLocations();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.remoteLocations.set([]);
    this.isRemoteSearching.set(false);
    if (this.remoteSearchTimer) clearTimeout(this.remoteSearchTimer);
  }

  searchRemoteLocations(): void {
    if (this.remoteSearchTimer) clearTimeout(this.remoteSearchTimer);
    const query = this.searchQuery().trim();
    if (query.length < 2) {
      this.remoteLocations.set([]);
      this.isRemoteSearching.set(false);
      return;
    }
    this.remoteSearchTimer = setTimeout(() => {
      this.remoteSearchSubscription?.unsubscribe();
      this.isRemoteSearching.set(true);
      this.remoteSearchSubscription = this.geocodingService.search(query, 6).subscribe(results => {
        this.remoteLocations.set(results);
        this.isRemoteSearching.set(false);
      });
    }, 300);
  }

  selectLocation(loc: GeoLocation): void {
    this.locationService.selectLocation(loc);
    this.closeMenus();

    const path = this.router.url.split('?')[0].replace(/^\//, '');
    const parts = path.split('/').filter(Boolean);
    const focusedExperiences = new Set(['time', 'weather', 'sun', 'moon', 'tonight', 'astronomy']);
    let target: string[] = [loc.id];

    if (parts.length === 1 && focusedExperiences.has(parts[0])) {
      target = [loc.id, parts[0]];
    } else if (parts.length >= 2 && focusedExperiences.has(parts[1])) {
      target = [loc.id, parts[1]];
    }

    this.router.navigate(target);
  }

  async detectGPS(): Promise<void> {
    const loc = await this.locationService.detectUserLocation();
    this.closeMenus();
    if (loc) this.router.navigate(['/', loc.id]);
  }
}
