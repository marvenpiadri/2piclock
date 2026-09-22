import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CelestialService } from '../../core/services/celestial.service';
import { TimeControlService, SimulationSpeed } from '../../core/services/time-control.service';
import { LocationService } from '../../core/services/location.service';
import { WeatherService } from '../../core/services/weather.service';
import { GeoLocation } from '../../core/models/location.model';

@Component({
  selector: 'app-sky-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sky-home.html',
  styleUrl: './sky-home.css'
})
export class SkyHomeComponent {
  private celestialService = inject(CelestialService);
  private timeControlService = inject(TimeControlService);
  private locationService = inject(LocationService);
  private weatherService = inject(WeatherService);

  readonly celestial = this.celestialService.celestialState;
  readonly weather = this.celestialService.currentWeather;
  readonly selectedLocation = this.locationService.selectedLocation;
  readonly allPresets = this.locationService.allPresets;
  readonly activeDate = this.timeControlService.currentActiveDate;
  readonly isLive = this.timeControlService.isLive;
  readonly isPlaying = this.timeControlService.isPlaying;
  readonly currentSpeed = this.timeControlService.simulationSpeed;
  readonly dayFraction = this.timeControlService.dayFraction;

  readonly localTime = this.celestialService.formattedLocalTime;
  readonly localDate = this.celestialService.formattedLocalDate;
  readonly timezoneDisplay = this.celestialService.timezoneDisplay;
  readonly polarAngles = this.celestialService.polarClockAngles;

  // Temperature unit toggle
  readonly isFahrenheit = signal<boolean>(false);

  formatMoonDistance(dist: number): string {
    return Math.round(dist).toLocaleString();
  }

  // Active panel tab
  readonly activeDrawerTab = signal<'telemetry' | 'weather' | 'controls'>('telemetry');

  // Quick jump time presets
  jumpToSolarEvent(event: 'dawn' | 'sunrise' | 'noon' | 'golden' | 'sunset' | 'blue' | 'night'): void {
    const events = this.celestial().solarEvents;
    let targetDate: Date | null = null;

    switch (event) {
      case 'dawn': targetDate = events.civilDawn || events.nauticalDawn; break;
      case 'sunrise': targetDate = events.sunrise; break;
      case 'noon': targetDate = events.solarNoon; break;
      case 'golden': targetDate = events.goldenHourEvening.start || events.goldenHourMorning.start; break;
      case 'sunset': targetDate = events.sunset; break;
      case 'blue': targetDate = events.blueHourEvening.start; break;
      case 'night': {
        // Midnight
        const d = this.activeDate();
        targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        break;
      }
    }

    if (targetDate) {
      const hours = targetDate.getHours();
      const minutes = targetDate.getMinutes();
      const seconds = targetDate.getSeconds();
      this.timeControlService.setTimeHoursMinutes(hours, minutes, seconds);
    }
  }

  onScrubberInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.timeControlService.setTimeOfDayFraction(val);
  }

  setLive(): void {
    this.timeControlService.setLive();
  }

  togglePlay(): void {
    this.timeControlService.togglePlayPause();
  }

  setSpeed(speed: SimulationSpeed): void {
    this.timeControlService.setSimulationSpeed(speed);
  }

  stepMinutes(min: number): void {
    this.timeControlService.stepMinutes(min);
  }

  toggleTempUnit(): void {
    this.isFahrenheit.update(v => !v);
  }

  selectLocation(loc: GeoLocation): void {
    this.locationService.selectLocation(loc);
  }

  formatTime(d: Date | null): string {
    if (!d) return '--:--';
    const loc = this.selectedLocation();
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
  }

  getTwilightBadgeClass(state: string): string {
    switch (state) {
      case 'day': return 'badge-day';
      case 'golden_hour': return 'badge-golden';
      case 'civil_twilight': return 'badge-civil';
      case 'nautical_twilight': return 'badge-nautical';
      case 'astronomical_twilight': return 'badge-astro';
      default: return 'badge-night';
    }
  }

  getTwilightLabel(state: string): string {
    switch (state) {
      case 'day': return 'Daylight';
      case 'golden_hour': return 'Golden Hour';
      case 'civil_twilight': return 'Civil Twilight';
      case 'nautical_twilight': return 'Nautical Twilight';
      case 'astronomical_twilight': return 'Astro Twilight';
      default: return 'Deep Night';
    }
  }

  getMoonPhaseIcon(phase: string): string {
    switch (phase) {
      case 'New Moon': return 'brightness_1';
      case 'Waxing Crescent': return 'nightlight_round';
      case 'First Quarter': return 'brightness_2';
      case 'Waxing Gibbous': return 'brightness_3';
      case 'Full Moon': return 'brightness_high';
      case 'Waning Gibbous': return 'brightness_3';
      case 'Third Quarter': return 'brightness_2';
      case 'Waning Crescent': return 'nightlight_round';
      default: return 'nightlight_round';
    }
  }
}
