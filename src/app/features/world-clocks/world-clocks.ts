import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LocationService } from '../../core/services/location.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { GeoLocation } from '../../core/models/location.model';
import { calculateSolarPosition, calculateSolarEvents } from '../../core/astronomy/astronomy-engine';
import { TerminatorRibbonComponent } from '../../shared/components/terminator-ribbon/terminator-ribbon';
import { ShareExportModalComponent } from '../../shared/components/share-export-modal/share-export-modal';
import { AnalogClockComponent } from '../../shared/components/analog-clock/analog-clock';
import { CountryFlagComponent } from '../../shared/components/country-flag/country-flag';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button';

interface WorldCitySkyData {
  location: GeoLocation;
  localTime: string;
  localDate: string;
  sunAltitude: number;
  sunAzimuth: number;
  twilightState: string;
  isDay: boolean;
  sunriseTime: string;
  sunsetTime: string;
  bgGradient: string;
}

@Component({
  selector: 'app-world-clocks',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    TerminatorRibbonComponent,
    ShareExportModalComponent,
    AnalogClockComponent,
    CountryFlagComponent,
    UiButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-clocks.html',
  styleUrl: './world-clocks.css'
})
export class WorldClocksComponent {
  private locationService = inject(LocationService);
  private timeControlService = inject(TimeControlService);
  readonly router = inject(Router);

  readonly allPresets = this.locationService.allPresets;
  readonly selectedLocation = this.locationService.selectedLocation;
  readonly activeDate = this.timeControlService.currentActiveDate;

  readonly showShareModal = signal<boolean>(false);
  readonly clockStyleMode = signal<'analog' | 'digital'>('analog');
  readonly visibleCityCount = signal(24);
  readonly visibleCitySkies = computed(() => this.citySkies().slice(0, this.visibleCityCount()));

  // Computed list of all cities with real-time astronomical and sky states
  readonly citySkies = computed<WorldCitySkyData[]>(() => {
    const date = this.activeDate();
    return this.allPresets.map((loc: any) => {
      const sun = calculateSolarPosition(date, loc.latitude, loc.longitude);
      const events = calculateSolarEvents(date, loc.latitude, loc.longitude);

      let localTime = '';
      let localDate = '';
      try {
        localTime = date.toLocaleTimeString('en-US', {
          timeZone: loc.timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        localDate = date.toLocaleDateString('en-US', {
          timeZone: loc.timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        localTime = date.toTimeString().slice(0, 8);
        localDate = date.toDateString();
      }

      const formatEvent = (d: Date | null) => {
        if (!d) return '--:--';
        try {
          return d.toLocaleTimeString('en-US', {
            timeZone: loc.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        } catch {
          return d.toTimeString().slice(0, 5);
        }
      };

      const alt = sun.altitudeDeg;
      let twilightState = 'Deep Night';
      let bgGradient = 'linear-gradient(135deg, #020617 0%, #0f172a 100%)';

      if (alt > 6) {
        twilightState = 'Daylight';
        bgGradient = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
      } else if (alt > 0) {
        twilightState = 'Golden Hour';
        bgGradient = 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)';
      } else if (alt > -6) {
        twilightState = 'Civil Twilight';
        bgGradient = 'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)';
      } else if (alt > -12) {
        twilightState = 'Nautical Twilight';
        bgGradient = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
      } else if (alt > -18) {
        twilightState = 'Astro Twilight';
        bgGradient = 'linear-gradient(135deg, #030712 0%, #1e1b4b 100%)';
      }

      return {
        location: loc,
        localTime,
        localDate,
        sunAltitude: Math.round(alt * 10) / 10,
        sunAzimuth: Math.round(sun.azimuthDeg),
        twilightState,
        isDay: alt > 0,
        sunriseTime: formatEvent(events.sunrise),
        sunsetTime: formatEvent(events.sunset),
        bgGradient
      };
    });
  });

  loadMoreCities(): void {
    this.visibleCityCount.update(count => Math.min(count + 24, this.citySkies().length));
  }

  selectAndGoToSky(loc: GeoLocation): void {
    this.locationService.selectLocation(loc);
    this.router.navigate(['/']);
  }
}
