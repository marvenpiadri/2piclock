import { Injectable, inject, computed, effect } from '@angular/core';
import { LocationService } from './location.service';
import { TimeControlService } from './time-control.service';
import { WeatherService } from './weather.service';
import { getCelestialState, get24HourSolarCurve } from '../astronomy/astronomy-engine';
import { CelestialState } from '../models/celestial.model';

@Injectable({
  providedIn: 'root'
})
export class CelestialService {
  private locationService = inject(LocationService);
  private timeControlService = inject(TimeControlService);
  private weatherService = inject(WeatherService);

  readonly selectedLocation = this.locationService.selectedLocation;
  readonly activeDate = this.timeControlService.currentActiveDate;
  readonly currentWeather = this.weatherService.currentWeather;
  readonly isWeatherLoading = this.weatherService.isLoading;

  constructor() {
    // Automatically fetch weather when location changes
    effect(() => {
      const loc = this.selectedLocation();
      this.weatherService.fetchWeatherForLocation(loc);
    });
  }

  // Active Astronomical & Celestial State computed from Date + Location
  readonly celestialState = computed<CelestialState>(() => {
    const loc = this.selectedLocation();
    const date = this.activeDate();
    return getCelestialState(date, loc.latitude, loc.longitude, loc.timezone);
  });

  // 24-hour Solar Elevation curve for the active day/location
  readonly solarCurve = computed(() => {
    const loc = this.selectedLocation();
    const date = this.activeDate();
    return get24HourSolarCurve(date, loc.latitude, loc.longitude, loc.timezone);
  });

  // 2Pi Clock Polar Angles (0 to 2*PI radians)
  readonly polarClockAngles = computed(() => {
    const state = this.celestialState();
    const date = this.activeDate();

    // Solar angle: 0 rad = Solar Noon (Top), PI rad = Solar Midnight (Bottom)
    // Or mapped clockwise 0 = 00:00 (Midnight), PI = 12:00 (Noon), 2PI = 24:00
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const timeAngleRad = (hours / 24) * 2 * Math.PI;

    // Sunrise & Sunset Angles on 24h dial
    const events = state.solarEvents;
    let sunriseAngleRad: number | null = null;
    let sunsetAngleRad: number | null = null;

    if (events.sunrise) {
      const h = events.sunrise.getUTCHours() + events.sunrise.getUTCMinutes() / 60 + events.sunrise.getUTCSeconds() / 3600;
      sunriseAngleRad = (h / 24) * 2 * Math.PI;
    }

    if (events.sunset) {
      const h = events.sunset.getUTCHours() + events.sunset.getUTCMinutes() / 60 + events.sunset.getUTCSeconds() / 3600;
      sunsetAngleRad = (h / 24) * 2 * Math.PI;
    }

    return {
      timeAngleRad,
      sunriseAngleRad,
      sunsetAngleRad,
      sunAltitude: state.sun.altitudeDeg,
      sunAzimuth: state.sun.azimuthDeg,
      moonAltitude: state.moon.altitudeDeg,
      moonAzimuth: state.moon.azimuthDeg
    };
  });

  // Formatted city local time
  readonly formattedLocalTime = computed(() => {
    const loc = this.selectedLocation();
    const date = this.activeDate();
    try {
      return date.toLocaleTimeString('en-US', {
        timeZone: loc.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return date.toTimeString().slice(0, 8);
    }
  });

  // Formatted date string in local timezone
  readonly formattedLocalDate = computed(() => {
    const loc = this.selectedLocation();
    const date = this.activeDate();
    try {
      return date.toLocaleDateString('en-US', {
        timeZone: loc.timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date.toDateString();
    }
  });

  // Timezone display (e.g. UTC+9 / JST)
  readonly timezoneDisplay = computed(() => {
    const loc = this.selectedLocation();
    const date = this.activeDate();
    try {
      const str = new Intl.DateTimeFormat('en-US', {
        timeZone: loc.timezone,
        timeZoneName: 'shortOffset'
      }).format(date);
      const parts = str.split(' ');
      return parts[parts.length - 1] || loc.timezone;
    } catch {
      return loc.timezone;
    }
  });
}
