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
  readonly selectedDate = signal<string>(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: this.allPresets[0]?.timezone ?? 'UTC'
    }).format(new Date())
  );
  readonly selectedTime = signal<string>('12:00');
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly copyNotification = signal<string | null>(null);
  readonly selectedHour = computed(() => parseInt(this.selectedTime().slice(0, 2), 10) || 12);

  // "When Is?" query selector
  readonly whenIsQuery = signal<'next-full-moon' | 'next-new-moon' | 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice' | 'solar-noon'>('next-full-moon');

  /**
   * Interpret the form's date/time as wall-clock time in the selected location.
   * The astronomy engine works with real UTC instants, so this conversion must
   * happen before any solar/lunar calculation. In particular, 00:00 must stay
   * midnight rather than being treated as a falsy value and becoming 12:00.
   */
  readonly parsedInstant = computed<Date>(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    const [h, min] = this.selectedTime().split(':').map(Number);
    const year = Number.isFinite(y) ? y : new Date().getFullYear();
    const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1;
    const day = Number.isFinite(d) && d >= 1 && d <= 31 ? d : 1;
    const hour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 12;
    const minute = Number.isFinite(min) && min >= 0 && min <= 59 ? min : 0;

    return this.getZonedDateTime(year, month, day, hour, minute, 0, this.selectedLocation().timezone);
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

  private getZonedDateTime(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timeZone: string,
    millisecond = 0
  ): Date {
    const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);

    const getOffsetMinutes = (instant: Date): number => {
      const value = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'longOffset'
      }).formatToParts(instant).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
      const match = value.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
      if (!match) return 0;
      const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
      return match[1] === '+' ? minutes : -minutes;
    };

    let instant = new Date(wallClockUtc - getOffsetMinutes(new Date(wallClockUtc)) * 60000);
    const correctedOffset = getOffsetMinutes(instant);
    if (correctedOffset !== getOffsetMinutes(new Date(wallClockUtc))) {
      instant = new Date(wallClockUtc - correctedOffset * 60000);
    }
    return instant;
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

  trajectoryX(hour: number): number {
    return Math.max(3, Math.min(97, (hour / 23) * 94 + 3));
  }

  trajectoryY(altitude: number): number {
    const normalized = Math.max(-90, Math.min(90, altitude));
    return 50 - (normalized / 90) * 42;
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
