import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CountryFlagComponent } from '../../shared/components/country-flag/country-flag';
import { LocationService } from '../../core/services/location.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { GeoLocation } from '../../core/models/location.model';
import { calculateSolarPosition, calculateSolarEvents } from '../../core/astronomy/astronomy-engine';

interface WorldClockStatus {
  location: GeoLocation; localTime: string; localTimeWithSeconds: string; solarAltitude: number;
  astroState: 'day'|'civil-twilight'|'nautical-twilight'|'astro-twilight'|'night'; statusLabel: string;
  utcOffset: string; sunriseTime: string; sunsetTime: string; solarNoonTime: string; dayLengthMinutes: number;
  twoPiPhaseRad: number; twoPiPhasePercent: number;
}
@Component({
 selector:'app-world-clocks', standalone:true, imports:[MatIconModule,CountryFlagComponent],
 changeDetection:ChangeDetectionStrategy.OnPush, templateUrl:'./world-clocks.html', styleUrl:'./world-clocks.css'
})
export class WorldClocksComponent {
 private readonly locationService=inject(LocationService);
 private readonly timeControlService=inject(TimeControlService);
 readonly selectedLocation=this.locationService.selectedLocation;
 readonly allPresets=this.locationService.allPresets;
 readonly activeDate=this.timeControlService.currentActiveDate;
  readonly candidateLocations = computed<GeoLocation[]>(() => {
    const selected = this.selectedLocation();
    const presets = this.allPresets;
    const major = presets.filter(loc => (loc.tier ?? 2) <= 2);
    const hasSelected = major.some(l => l.id === selected.id);
    if (!hasSelected) {
      return [selected, ...major].slice(0, 24);
    }
    const rest = major.filter(l => l.id !== selected.id);
    return [selected, ...rest].slice(0, 24);
  });

  readonly displayedClocks = computed<WorldClockStatus[]>(() => {
    const date = this.activeDate();
    const candidates = this.candidateLocations();

    return candidates.map(loc => {
      const sun = calculateSolarPosition(date, loc.latitude, loc.longitude);
      const events = calculateSolarEvents(date, loc.latitude, loc.longitude);
      let localTime = '--:--';
      let localTimeWithSeconds = '--:--:--';
      let utcOffset = 'UTC';

      try {
        localTime = new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
        localTimeWithSeconds = new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, timeZoneName: 'shortOffset' }).formatToParts(date);
        utcOffset = parts.find(p => p.type === 'timeZoneName')?.value ?? 'UTC';
      } catch {
        utcOffset = 'UTC';
      }

      const altitude = sun.altitudeDeg;
      let astroState: WorldClockStatus['astroState'] = 'night';
      let statusLabel = 'Deep Night';
      if (altitude > 6) {
        astroState = 'day';
        statusLabel = 'Full Daylight';
      } else if (altitude > 0) {
        astroState = 'day';
        statusLabel = 'Golden Hour';
      } else if (altitude > -6) {
        astroState = 'civil-twilight';
        statusLabel = 'Civil Twilight';
      } else if (altitude > -12) {
        astroState = 'nautical-twilight';
        statusLabel = 'Nautical Twilight';
      } else if (altitude > -18) {
        astroState = 'astro-twilight';
        statusLabel = 'Astronomical Twilight';
      }

      const [hh, mm, ss] = localTimeWithSeconds.split(':').map(Number);
      const phase = ((hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0)) / 86400;

      return {
        location: loc,
        localTime,
        localTimeWithSeconds,
        solarAltitude: Math.round(altitude * 10) / 10,
        astroState,
        statusLabel,
        utcOffset,
        sunriseTime: events.sunrise ? this.formatTime(events.sunrise, loc.timezone) : '--:--',
        sunsetTime: events.sunset ? this.formatTime(events.sunset, loc.timezone) : '--:--',
        solarNoonTime: events.solarNoon ? this.formatTime(events.solarNoon, loc.timezone) : '--:--',
        dayLengthMinutes: Math.round(events.dayLengthMinutes),
        twoPiPhaseRad: Math.round(phase * 2 * Math.PI * 100) / 100,
        twoPiPhasePercent: Math.round(phase * 100)
      };
    });
  });

  readonly worldClockStatuses = this.displayedClocks;
 selectLocation(location:GeoLocation){this.locationService.selectLocation(location);}
 private formatTime(date:Date,timezone:string){try{return new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}catch{return '--:--';}}
}