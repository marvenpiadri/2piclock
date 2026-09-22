import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveSkyComponent } from './shared/components/reactive-sky/reactive-sky';
import { LocationService } from './core/services/location.service';
import { CelestialService } from './core/services/celestial.service';
import { GeoLocation } from './core/models/location.model';
import { CountryFlagPipe } from './core/pipes/country-flag.pipe';
import { GeocodingService } from './core/services/geocoding.service';
import { Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, ReactiveSkyComponent, CountryFlagPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private locationService = inject(LocationService);
  private celestialService = inject(CelestialService);
  private geocodingService = inject(GeocodingService);

  readonly selectedLocation = this.locationService.selectedLocation;
  readonly allLocations = this.locationService.allPresets;
  readonly isLocating = this.locationService.isLocating;
  readonly locationError = this.locationService.locationError;

  readonly localTime = this.celestialService.formattedLocalTime;
  readonly celestial = this.celestialService.celestialState;

  // Dropdown states
  showLocationDropdown = signal<boolean>(false);
  showPrefDropdown = signal<boolean>(false);

  // Search filter for city picker
  searchQuery = signal<string>('');
  readonly remoteLocations = signal<GeoLocation[]>([]);
  readonly isRemoteSearching = signal(false);
  private remoteSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private remoteSearchSubscription: Subscription | null = null;

  // Custom coordinates input
  customLat = signal<number>(35.6762);
  customLng = signal<number>(139.6503);
  customName = signal<string>('Custom Spot');

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
      this.showPrefDropdown.set(false);
    }
  }

  togglePrefDropdown(): void {
    this.showPrefDropdown.update(v => !v);
    if (this.showPrefDropdown()) {
      this.showLocationDropdown.set(false);
    }
  }

  closeMenus(): void {
    if (this.remoteSearchTimer) clearTimeout(this.remoteSearchTimer);
    this.showLocationDropdown.set(false);
    this.showPrefDropdown.set(false);
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

  applyCustomCoordinates(): void {
    this.locationService.setCustomCoordinates(
      this.customName(),
      this.customLat(),
      this.customLng()
    );
    this.closeMenus();
  }
}
