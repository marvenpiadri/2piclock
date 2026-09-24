import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LocationService } from '../../core/services/location.service';
import {
  AstronomicalCalculatorService,
  DaylightAnalysis,
  SolarCalculatorResult,
  MoonCalculatorResult,
  AstronomicalEventItem
} from '../../core/services/astronomical-calculator.service';
import { GeoLocation } from '../../core/models/location.model';
import { MoonPhaseIndicator } from '../../shared/components/moon-phase-indicator/moon-phase-indicator';

export type AstronomyTab = 'solar' | 'daylight' | 'moon' | 'events';

@Component({
  selector: 'app-astronomy-suite',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MoonPhaseIndicator
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './astronomy-suite.html',
  styleUrl: './astronomy-suite.css'
})
export class AstronomySuiteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private locationService = inject(LocationService);
  private astroCalc = inject(AstronomicalCalculatorService);

  readonly allPresets = this.locationService.allPresets;
  readonly activeTab = signal<AstronomyTab>('solar');
  readonly selectedLocation = signal<GeoLocation>(this.allPresets[0]);
  readonly selectedDate = signal<string>(new Date().toISOString().slice(0, 10));
  readonly selectedTime = signal<string>('12:00');
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly copyNotification = signal<string | null>(null);
  readonly Math = Math;

  // "When Is?" query selector
  readonly whenIsQuery = signal<'next-full-moon' | 'next-new-moon' | 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice' | 'solar-noon'>('next-full-moon');

  readonly parsedInstant = computed<Date>(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    const [h, min] = this.selectedTime().split(':').map(Number);
    return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, h || 12, min || 0, 0));
  });

  // --- Calculations ---
  readonly solarResult = computed<SolarCalculatorResult>(() => {
    return this.astroCalc.calculateSolar(this.selectedLocation(), this.parsedInstant());
  });

  readonly daylightResult = computed<DaylightAnalysis>(() => {
    return this.astroCalc.calculateDaylight(this.selectedLocation(), this.parsedInstant());
  });

  readonly moonResult = computed<MoonCalculatorResult>(() => {
    return this.astroCalc.calculateMoon(this.selectedLocation(), this.parsedInstant());
  });

  readonly eventsResult = computed<AstronomicalEventItem[]>(() => {
    return this.astroCalc.calculateYearlyEvents(this.selectedYear(), this.selectedLocation());
  });

  readonly whenIsResult = computed(() => {
    return this.astroCalc.solveWhenIs(this.whenIsQuery(), this.selectedLocation(), this.selectedYear());
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && this.isValidTab(params['tab'])) {
        this.activeTab.set(params['tab'] as AstronomyTab);
      }
      if (params['loc']) {
        const found = this.allPresets.find(p => p.id === params['loc'] || p.name.toLowerCase() === params['loc'].toLowerCase());
        if (found) this.selectedLocation.set(found);
      }
      if (params['date']) {
        this.selectedDate.set(params['date']);
      }
      if (params['time']) {
        this.selectedTime.set(params['time']);
      }
    });
  }

  setTab(tab: AstronomyTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private isValidTab(tab: string): boolean {
    return ['solar', 'daylight', 'moon', 'events'].includes(tab);
  }

  setLocation(loc: GeoLocation): void {
    this.selectedLocation.set(loc);
  }

  setLocationById(id: string): void {
    const loc = this.allPresets.find(p => p.id === id);
    if (loc) this.selectedLocation.set(loc);
  }

  setWhenIsQuery(query: 'next-full-moon' | 'next-new-moon' | 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice' | 'solar-noon'): void {
    this.whenIsQuery.set(query);
  }

  formatTime(date: Date | null): string {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      timeZone: this.selectedLocation().timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  getCompassHeading(azimuthDeg: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(azimuthDeg / 22.5) % 16;
    return directions[idx] || 'N';
  }

  copyShareLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copyNotification.set('Astronomical calculation link copied!');
      setTimeout(() => this.copyNotification.set(null), 3500);
    });
  }
}
