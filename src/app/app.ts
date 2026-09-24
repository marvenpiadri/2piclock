import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveSkyComponent } from './shared/components/reactive-sky/reactive-sky';
import { DeepSpaceBackdropComponent } from './shared/components/deep-space-backdrop/deep-space-backdrop';
import { CountryFlagComponent, ASMRPlayerComponent } from './shared/components';
import { GlassThemeService } from './core/services/glass-theme.service';
import { LocationService } from './core/services/location.service';
import { CelestialService } from './core/services/celestial.service';
import { ObservatoryViewService, ObservatoryView } from './core/services/observatory-view.service';
import { GeoLocation } from './core/models/location.model';
import { GeocodingService } from './core/services/geocoding.service';
import { Subscription } from 'rxjs';

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
    ASMRPlayerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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

  readonly localTime = this.celestialService.formattedLocalTime;
  readonly localDate = this.celestialService.formattedLocalDate;
  readonly celestial = this.celestialService.celestialState;

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
      title: 'Celestial Horizons',
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
          label: 'Solar & Twilight Tracker',
          path: '/',
          view: 'sky',
          desc: 'Civil (-6°), Nautical (-12°), and Astronomical (-18°) solar boundary tracker.',
          icon: 'wb_twilight'
        }
      ]
    },
    {
      title: 'Earth & Global Clocks',
      icon: 'public',
      items: [
        {
          label: 'World Clocks',
          path: '/world-clocks',
          desc: 'Live clocks across major cities and time zones.',
          icon: 'schedule',
          tag: 'Multi-City'
        },
        {
          label: 'World Map',
          path: '/world',
          desc: 'Continuous analytical 2D terminator curve, subsolar zenith, and timezone grid.',
          icon: 'public'
        },
        {
          label: 'Golden Hour & Meeting Planner',
          path: '/meeting-planner',
          desc: 'Synchronized multi-location overlap calculator and optimum lighting planner.',
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
          path: '/deep-space-observatory',
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
  }

  detectGPS(): void {
    this.locationService.detectUserLocation();
    this.closeMenus();
  }
}
