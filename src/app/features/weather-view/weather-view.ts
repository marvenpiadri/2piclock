import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import { LocationService } from '../../core/services/location.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { WeatherService } from '../../core/services/weather.service';
import { GeoLocation } from '../../core/models/location.model';
import { WeatherBarChartComponent } from '../../shared/components';

export type WeatherLayer = 'wind' | 'gusts' | 'temperature' | 'rain' | 'clouds' | 'pressure';
export type AltitudeLevel = 'surface' | '950hpa' | '850hpa' | '700hpa' | '500hpa' | '300hpa';

interface WeatherGridPoint {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    cloud_cover?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    surface_pressure?: number[];
  };
}

interface SampledWeatherPoint {
  latitude: number;
  longitude: number;
  temperature: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  gust: number;
  pressure: number;
}

interface Particle {
  latitude: number;
  longitude: number;
  age: number;
  maxAge: number;
  speedMultiplier: number;
}

export interface SpotPinData {
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  temperatureC: number;
  temperatureF: number;
  windSpeedKmh: number;
  windSpeedKnots: number;
  windDirectionDeg: number;
  windGustKmh: number;
  precipitationMm: number;
  cloudCoverPct: number;
  pressureHpa: number;
  conditionLabel: string;
  distanceKm: number;
}

export interface MeteogramStep {
  timeMs: number;
  timeLabel: string;
  dayLabel: string;
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  cloudCoverPct: number;
  conditionIcon: string;
  isDaytime: boolean;
}

@Component({
  selector: 'app-weather-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, WeatherBarChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weather-view.html',
  styleUrl: './weather-view.css'
})
export class WeatherViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('particleCanvas', { static: true }) particleCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly locationService = inject(LocationService);
  private readonly timeControl = inject(TimeControlService);
  readonly weatherService = inject(WeatherService);

  readonly selectedLocation = this.locationService.selectedLocation;
  readonly allPresets = this.locationService.allPresets;
  readonly activeDate = this.timeControl.currentActiveDate;
  readonly liveWeather = this.weatherService.currentWeather;

  // Active state signals
  readonly activeLayer = signal<WeatherLayer>('wind');
  readonly activeAltitude = signal<AltitudeLevel>('surface');
  readonly isPlaying = signal<boolean>(true);
  readonly particleSpeed = signal<1 | 2 | 4>(1);
  readonly isLoading = signal<boolean>(false);
  readonly dataError = signal<boolean>(false);
  readonly forecastIndex = signal<number>(0);
  readonly forecastMax = signal<number>(0);
  readonly isInspectorOpen = signal<boolean>(true);
  readonly isMeteogramOpen = signal<boolean>(false);
  readonly selectedSpot = signal<SpotPinData | null>(null);
  readonly Math = Math;

  // Layer list configuration
  readonly layerOptions: { id: WeatherLayer; label: string; icon: string; unit: string }[] = [
    { id: 'wind', label: 'Wind', icon: 'air', unit: 'km/h' },
    { id: 'gusts', label: 'Gusts', icon: 'cyclone', unit: 'km/h' },
    { id: 'temperature', label: 'Temp', icon: 'device_thermostat', unit: '°C' },
    { id: 'rain', label: 'Rain / Radar', icon: 'water_drop', unit: 'mm/h' },
    { id: 'clouds', label: 'Clouds', icon: 'cloud', unit: '%' },
    { id: 'pressure', label: 'Pressure', icon: 'speed', unit: 'hPa' }
  ];

  // Altitude pressure levels
  readonly altitudeLevels: { id: AltitudeLevel; label: string; altitudeLabel: string }[] = [
    { id: '300hpa', label: '300 hPa', altitudeLabel: '9,000m · Jet Stream' },
    { id: '500hpa', label: '500 hPa', altitudeLabel: '5,500m · Mid-trop' },
    { id: '700hpa', label: '700 hPa', altitudeLabel: '3,000m' },
    { id: '850hpa', label: '850 hPa', altitudeLabel: '1,500m' },
    { id: '950hpa', label: '950 hPa', altitudeLabel: '600m' },
    { id: 'surface', label: 'Surface', altitudeLabel: '10m' }
  ];

  // Global landmark observatories for quick flying
  readonly worldHotspots = [
    { name: 'Local', action: 'local', icon: 'my_location' },
    { name: 'Tokyo', lat: 35.68, lon: 139.76, label: 'Typhoon Corridor' },
    { name: 'Reykjavik', lat: 64.14, lon: -21.94, label: 'Polar Vortex' },
    { name: 'Cape Town', lat: -33.92, lon: 18.42, label: 'Roaring Forties' },
    { name: 'Honolulu', lat: 21.31, lon: -157.86, label: 'Trade Winds' },
    { name: 'New York', lat: 40.71, lon: -74.01, label: 'Atlantic Front' }
  ];

  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private animationFrameId?: number;
  private lastFrame = 0;
  private fetchTimer?: ReturnType<typeof setTimeout>;
  private playIntervalId?: ReturnType<typeof setInterval>;
  private readonly cache = new Map<string, { expiresAt: number; points: WeatherGridPoint[] }>();

  private gridPoints: WeatherGridPoint[] = [];
  private forecastTimes: number[] = [];
  private particles: Particle[] = [];
  private particleContext?: CanvasRenderingContext2D;

  readonly activeForecastTime = computed(() => {
    const index = Math.max(0, Math.min(this.forecastIndex(), Math.max(0, this.forecastTimes.length - 1)));
    return this.forecastTimes[index] ? new Date(this.forecastTimes[index]) : this.activeDate();
  });

  readonly activeField = computed<SampledWeatherPoint[]>(() => {
    const index = this.forecastIndex();
    const altitude = this.activeAltitude();
    // Altitude scaling factor for wind speed and temperature lapse
    const speedMult = altitude === '300hpa' ? 2.6 : altitude === '500hpa' ? 2.0 : altitude === '700hpa' ? 1.5 : altitude === '850hpa' ? 1.25 : altitude === '950hpa' ? 1.1 : 1.0;
    const tempLapseC = altitude === '300hpa' ? -42 : altitude === '500hpa' ? -26 : altitude === '700hpa' ? -14 : altitude === '850hpa' ? -7 : altitude === '950hpa' ? -3 : 0;

    return this.gridPoints.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      temperature: (point.hourly.temperature_2m?.[index] ?? 18) + tempLapseC,
      precipitation: point.hourly.precipitation?.[index] ?? 0,
      cloudCover: point.hourly.cloud_cover?.[index] ?? 0,
      windSpeed: Math.round((point.hourly.wind_speed_10m?.[index] ?? 15) * speedMult),
      windDirection: (point.hourly.wind_direction_10m?.[index] ?? 0) + (altitude === '300hpa' ? 25 : 0),
      gust: Math.round((point.hourly.wind_gusts_10m?.[index] ?? 22) * speedMult),
      pressure: point.hourly.surface_pressure?.[index] ?? 1013
    }));
  });

  readonly layerTitle = computed(() => {
    const current = this.layerOptions.find(l => l.id === this.activeLayer());
    return current ? current.label : 'Wind';
  });

  readonly meteogramSteps = computed<MeteogramStep[]>(() => {
    if (!this.gridPoints.length || !this.forecastTimes.length) return [];
    const centerPoint = this.gridPoints[Math.floor(this.gridPoints.length / 2)] || this.gridPoints[0];
    const steps: MeteogramStep[] = [];
    const stepInterval = 3; // every 3 hours

    for (let i = 0; i < Math.min(this.forecastTimes.length, 72); i += stepInterval) {
      const timeMs = this.forecastTimes[i];
      const d = new Date(timeMs);
      const tempC = centerPoint.hourly.temperature_2m?.[i] ?? 15;
      const precip = centerPoint.hourly.precipitation?.[i] ?? 0;
      const clouds = centerPoint.hourly.cloud_cover?.[i] ?? 20;
      const windSpd = centerPoint.hourly.wind_speed_10m?.[i] ?? 12;
      const windDir = centerPoint.hourly.wind_direction_10m?.[i] ?? 0;
      const hour = d.getUTCHours();
      const isDaytime = hour >= 6 && hour <= 18;

      let icon = 'wb_sunny';
      if (precip > 2) icon = 'thunderstorm';
      else if (precip > 0.4) icon = 'rainy';
      else if (clouds > 75) icon = 'cloud';
      else if (clouds > 35) icon = 'partly_cloudy_day';
      else if (!isDaytime) icon = 'nightlight';

      steps.push({
        timeMs,
        timeLabel: `${String(d.getHours()).padStart(2, '0')}:00`,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        temperatureC: Math.round(tempC),
        windSpeedKmh: Math.round(windSpd),
        windDirectionDeg: Math.round(windDir),
        precipitationMm: Math.round(precip * 10) / 10,
        cloudCoverPct: Math.round(clouds),
        conditionIcon: icon,
        isDaytime
      });
    }

    return steps;
  });

  constructor() {
    effect(() => {
      this.scheduleGridFetch(this.selectedLocation());
    });

    effect(() => {
      this.activeDate();
      if (this.forecastTimes.length) {
        this.forecastIndex.set(this.closestForecastIndex(this.activeDate().getTime()));
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());

    const loc = this.selectedLocation();
    // Keep the compact current-weather telemetry in sync without making the
    // global application shell fetch weather for unrelated routes.
    this.weatherService.fetchWeatherForLocation(loc);

    this.map = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [loc.longitude, loc.latitude],
      zoom: 6.2,
      attributionControl: { compact: true }
    });

    this.map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

    this.map.on('load', () => {
      this.installWeatherSource();
      this.loadParticles();
      this.resizeCanvas();
      this.startAnimation();
      this.scheduleGridFetch(loc, true);
    });

    this.map.on('click', (e) => {
      this.handleMapClick(e.lngLat.lng, e.lngLat.lat, e.point.x, e.point.y);
    });

    this.map.on('move', () => {
      this.updateSelectedSpotPosition();
    });

    this.map.on('moveend', () => {
      const center = this.map?.getCenter();
      if (!center) return;
      const distance = this.distanceKm(center.lat, center.lng, loc.latitude, loc.longitude);
      if (distance > 220) {
        const movedLocation: GeoLocation = {
          ...loc,
          id: 'weather-map-center',
          latitude: center.lat,
          longitude: center.lng
        };
        this.scheduleGridFetch(movedLocation);
      }
    });

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.mapContainer.nativeElement);

    this.startPlayTimer();
  }

  ngOnDestroy(): void {
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    if (this.playIntervalId) clearInterval(this.playIntervalId);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  setLayer(layer: WeatherLayer): void {
    this.activeLayer.set(layer);
    this.updateWeatherSource();
  }

  setAltitude(altitude: AltitudeLevel): void {
    this.activeAltitude.set(altitude);
    this.updateWeatherSource();
  }

  togglePlay(): void {
    this.isPlaying.update(v => !v);
  }

  toggleInspector(): void {
    this.isInspectorOpen.update(v => !v);
  }

  toggleMeteogram(): void {
    this.isMeteogramOpen.update(v => !v);
  }

  closeSpot(): void {
    this.selectedSpot.set(null);
  }

  setParticleSpeed(speed: number): void {
    if (speed === 1 || speed === 2 || speed === 4) {
      this.particleSpeed.set(speed);
    }
  }

  onForecastInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.forecastIndex.set(value);
    this.updateWeatherSource();
    this.refreshSpotAtCurrentIndex();
  }

  jumpForecast(offsetHours: number): void {
    const next = Math.max(0, Math.min(this.forecastMax(), this.forecastIndex() + offsetHours));
    this.forecastIndex.set(next);
    this.updateWeatherSource();
    this.refreshSpotAtCurrentIndex();
  }

  centerLocation(): void {
    const loc = this.selectedLocation();
    this.map?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 6.8, duration: 800 });
  }

  flyToHotspot(hotspot: any): void {
    if (hotspot.action === 'local') {
      this.centerLocation();
      return;
    }
    this.map?.flyTo({ center: [hotspot.lon, hotspot.lat], zoom: 6.5, duration: 1000 });
  }

  adoptSpotAsActiveLocation(): void {
    const spot = this.selectedSpot();
    if (!spot) return;
    const newLoc: GeoLocation = {
      id: `spot-${spot.latitude.toFixed(2)}-${spot.longitude.toFixed(2)}`,
      name: `Spot ${spot.latitude > 0 ? spot.latitude.toFixed(2) + '°N' : Math.abs(spot.latitude).toFixed(2) + '°S'}`,
      country: 'Observatory Pin',
      countryCode: this.selectedLocation().countryCode,
      flag: this.selectedLocation().flag || '📍',
      latitude: spot.latitude,
      longitude: spot.longitude,
      timezone: this.selectedLocation().timezone
    };
    this.locationService.selectLocation(newLoc);
    this.selectedSpot.set(null);
  }

  private startPlayTimer(): void {
    if (this.playIntervalId) clearInterval(this.playIntervalId);
    this.playIntervalId = setInterval(() => {
      if (!this.isPlaying()) return;
      const current = this.forecastIndex();
      const max = this.forecastMax();
      if (max <= 0) return;
      const next = current >= max ? 0 : current + 1;
      this.forecastIndex.set(next);
      this.updateWeatherSource();
      this.refreshSpotAtCurrentIndex();
    }, 1400);
  }

  private handleMapClick(lon: number, lat: number, x: number, y: number): void {
    const field = this.activeField();
    if (!field.length) return;
    const sampled = this.sampleWind(lat, lon, field);
    const origin = this.selectedLocation();
    const distance = Math.round(this.distanceKm(lat, lon, origin.latitude, origin.longitude));

    let conditionLabel = 'Clear';
    if (sampled.precipitation > 2) conditionLabel = 'Thunderstorm';
    else if (sampled.precipitation > 0.5) conditionLabel = 'Rain Shower';
    else if (sampled.cloudCover > 70) conditionLabel = 'Overcast';
    else if (sampled.cloudCover > 30) conditionLabel = 'Partly Cloudy';

    this.selectedSpot.set({
      latitude: lat,
      longitude: lon,
      x,
      y,
      temperatureC: Math.round(sampled.temperature * 10) / 10,
      temperatureF: Math.round((sampled.temperature * 9 / 5 + 32) * 10) / 10,
      windSpeedKmh: Math.round(sampled.windSpeed),
      windSpeedKnots: Math.round(sampled.windSpeed * 0.539957),
      windDirectionDeg: Math.round(sampled.windDirection),
      windGustKmh: Math.round(sampled.gust),
      precipitationMm: Math.round(sampled.precipitation * 10) / 10,
      cloudCoverPct: Math.round(sampled.cloudCover),
      pressureHpa: Math.round(sampled.pressure),
      conditionLabel,
      distanceKm: distance
    });
  }

  private updateSelectedSpotPosition(): void {
    const spot = this.selectedSpot();
    if (!spot || !this.map) return;
    const pos = this.map.project([spot.longitude, spot.latitude]);
    this.selectedSpot.update(s => s ? { ...s, x: pos.x, y: pos.y } : null);
  }

  private refreshSpotAtCurrentIndex(): void {
    const spot = this.selectedSpot();
    if (!spot) return;
    const field = this.activeField();
    if (!field.length) return;
    const sampled = this.sampleWind(spot.latitude, spot.longitude, field);
    this.selectedSpot.update(s => s ? {
      ...s,
      temperatureC: Math.round(sampled.temperature * 10) / 10,
      temperatureF: Math.round((sampled.temperature * 9 / 5 + 32) * 10) / 10,
      windSpeedKmh: Math.round(sampled.windSpeed),
      windSpeedKnots: Math.round(sampled.windSpeed * 0.539957),
      windDirectionDeg: Math.round(sampled.windDirection),
      windGustKmh: Math.round(sampled.gust),
      precipitationMm: Math.round(sampled.precipitation * 10) / 10,
      cloudCoverPct: Math.round(sampled.cloudCover),
      pressureHpa: Math.round(sampled.pressure)
    } : null);
  }

  private scheduleGridFetch(loc: GeoLocation, immediate = false): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => this.fetchWeatherGrid(loc), immediate ? 0 : 250);
  }

  private fetchWeatherGrid(loc: GeoLocation): void {
    const key = loc.latitude.toFixed(1) + ':' + loc.longitude.toFixed(1);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.applyGrid(cached.points);
      this.map?.flyTo({ center: [loc.longitude, loc.latitude], duration: 500 });
      return;
    }

    this.isLoading.set(true);
    this.dataError.set(false);

    const points = this.buildGrid(loc.latitude, loc.longitude);
    const params = new HttpParams()
      .set('latitude', points.map(p => p.latitude.toFixed(3)).join(','))
      .set('longitude', points.map(p => p.longitude.toFixed(3)).join(','))
      .set('hourly', 'temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure')
      .set('forecast_days', '4')
      .set('timezone', 'GMT')
      .set('wind_speed_unit', 'kmh')
      .set('precipitation_unit', 'mm');

    this.http.get<any>('https://api.open-meteo.com/v1/forecast', { params }).subscribe({
      next: data => {
        const rows: WeatherGridPoint[] = Array.isArray(data) ? data : [data];

        if (!rows.length || !rows[0]?.hourly?.time?.length) {
          this.dataError.set(true);
          this.isLoading.set(false);
          return;
        }

        this.cache.set(key, {
          points: rows,
          expiresAt: Date.now() + 20 * 60 * 1000
        });

        this.applyGrid(rows);
        this.isLoading.set(false);
      },
      error: () => {
        this.dataError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  private applyGrid(points: WeatherGridPoint[]): void {
    this.gridPoints = points;
    this.forecastTimes = (points[0]?.hourly.time ?? []).map(t =>
      new Date(t.endsWith('Z') ? t : t + 'Z').getTime()
    );
    this.forecastMax.set(Math.max(0, this.forecastTimes.length - 1));
    this.forecastIndex.set(this.closestForecastIndex(this.activeDate().getTime()));
    this.installWeatherSource();
    this.updateWeatherSource();
    this.resetParticles();
  }

  private closestForecastIndex(epoch: number): number {
    if (!this.forecastTimes.length) return 0;
    let best = 0;
    let distance = Infinity;

    this.forecastTimes.forEach((time, index) => {
      const currentDistance = Math.abs(time - epoch);
      if (currentDistance < distance) {
        distance = currentDistance;
        best = index;
      }
    });

    return best;
  }

  private buildGrid(latitude: number, longitude: number): { latitude: number; longitude: number }[] {
    const zoom = this.map?.getZoom() ?? 6;
    const latRadius = zoom > 8 ? 0.9 : zoom > 6 ? 1.8 : 3.5;
    const cosLat = Math.max(0.2, Math.cos(latitude * Math.PI / 180));
    const lonRadius = latRadius / cosLat;
    const points: { latitude: number; longitude: number }[] = [];

    // Dense 6x6 sampling grid for smooth interpolation across viewport
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        points.push({
          latitude: latitude + (y / 3) * latRadius,
          longitude: longitude + (x / 3) * lonRadius
        });
      }
    }

    return points;
  }

  private installWeatherSource(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    if (!this.map.getSource('weather-field')) {
      this.map.addSource('weather-field', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.map.addLayer({
        id: 'weather-field-heat',
        type: 'circle',
        source: 'weather-field',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 38, 7, 65, 10, 110],
          'circle-opacity': 0.38,
          'circle-blur': 0.92,
          'circle-color': '#f59e0b'
        }
      });
    }
  }

  private updateWeatherSource(): void {
    if (!this.map) return;
    const source = this.map.getSource('weather-field') as any;
    if (!source) return;

    const features = this.activeField().map(point => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] },
      properties: {
        value: this.layerValue(point)
      }
    }));

    source.setData({
      type: 'FeatureCollection',
      features
    });

    if (this.map.getLayer('weather-field-heat')) {
      this.map.setPaintProperty(
        'weather-field-heat',
        'circle-color',
        this.layerColorExpression()
      );
    }
  }

  private layerValue(point: SampledWeatherPoint): number {
    switch (this.activeLayer()) {
      case 'temperature': return point.temperature;
      case 'rain': return point.precipitation;
      case 'clouds': return point.cloudCover;
      case 'gusts': return point.gust;
      case 'pressure': return point.pressure;
      default: return point.windSpeed;
    }
  }

  private layerColorExpression(): any {
    switch (this.activeLayer()) {
      case 'temperature':
        return ['interpolate', ['linear'], ['get', 'value'],
          -15, '#6366f1', -5, '#38bdf8', 5, '#2dd4bf', 15, '#22c55e', 24, '#fbbf24', 32, '#f97316', 42, '#ef4444'];
      case 'rain':
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#0f172a', 0.2, '#38bdf8', 1.5, '#22c55e', 5, '#fbbf24', 12, '#f97316', 30, '#ef4444'];
      case 'clouds':
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#020617', 25, '#334155', 60, '#94a3b8', 95, '#f8fafc'];
      case 'gusts':
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#065f46', 25, '#10b981', 45, '#fbbf24', 70, '#f97316', 100, '#ef4444', 130, '#ec4899'];
      case 'pressure':
        return ['interpolate', ['linear'], ['get', 'value'],
          985, '#a855f7', 1000, '#38bdf8', 1013, '#10b981', 1025, '#fbbf24', 1038, '#f97316'];
      default:
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#0284c7', 15, '#10b981', 30, '#facc15', 50, '#f97316', 75, '#ef4444', 105, '#ec4899'];
    }
  }

  private loadParticles(): void {
    this.particleContext = this.particleCanvas.nativeElement.getContext('2d') ?? undefined;
    this.resetParticles();
  }

  private resetParticles(): void {
    if (!this.map) return;

    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    const latRadius = zoom > 8 ? 1.2 : zoom > 6 ? 2.5 : 5.5;
    const lonRadius = latRadius / Math.max(0.2, Math.cos(center.lat * Math.PI / 180));

    // High density 1,600 streamlines for that signature silky Windy.com look
    this.particles = Array.from({ length: 1600 }, () => ({
      latitude: center.lat + (Math.random() * 2 - 1) * latRadius,
      longitude: center.lng + (Math.random() * 2 - 1) * lonRadius,
      age: Math.random() * 80,
      maxAge: 70 + Math.random() * 60,
      speedMultiplier: 0.85 + Math.random() * 0.3
    }));
  }

  private startAnimation(): void {
    if (!this.particleContext || !this.map) return;
    this.lastFrame = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(80, now - this.lastFrame);
      this.lastFrame = now;

      if (this.isPlaying()) this.renderParticles(dt);
      else this.fadeCanvas();

      this.animationFrameId = requestAnimationFrame(frame);
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  private renderParticles(dtMs: number): void {
    const canvas = this.particleCanvas.nativeElement;
    const ctx = this.particleContext;
    if (!ctx || !this.map) return;

    // Semi-transparent trailing black fill gives Windy's fluid trail motion blur
    ctx.fillStyle = 'rgba(5, 8, 13, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const field = this.activeField();
    if (!field.length) return;

    const altitudeMult = this.activeAltitude() === '300hpa' ? 2.8 : this.activeAltitude() === '500hpa' ? 2.0 : 1.0;
    const stepHours = (dtMs / 3600000) * this.particleSpeed() * 3.8 * altitudeMult;

    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';

    for (const particle of this.particles) {
      const wind = this.sampleWind(particle.latitude, particle.longitude, field);
      const before = this.map.project([particle.longitude, particle.latitude]);
      const radians = wind.windDirection * Math.PI / 180;
      const north = Math.cos(radians) * wind.windSpeed * stepHours * particle.speedMultiplier;
      const east = Math.sin(radians) * wind.windSpeed * stepHours * particle.speedMultiplier;

      particle.latitude += north / 111;
      particle.longitude += east / (111 * Math.max(0.2, Math.cos(particle.latitude * Math.PI / 180)));
      particle.age += 1;

      const after = this.map.project([particle.longitude, particle.latitude]);

      if (
        particle.age > particle.maxAge ||
        after.x < -40 || after.y < -40 ||
        after.x > canvas.clientWidth + 40 ||
        after.y > canvas.clientHeight + 40
      ) {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const spread = zoom > 8 ? 1.0 : zoom > 6 ? 2.2 : 5.0;
        particle.latitude = center.lat + (Math.random() * 2 - 1) * spread;
        particle.longitude = center.lng + (Math.random() * 2 - 1) * (spread / Math.max(0.2, Math.cos(center.lat * Math.PI / 180)));
        particle.age = 0;
        continue;
      }

      // Windy-style velocity-based dynamic particle stroke color
      ctx.strokeStyle = this.getVelocityColor(wind.windSpeed);
      ctx.beginPath();
      ctx.moveTo(before.x, before.y);
      ctx.lineTo(after.x, after.y);
      ctx.stroke();
    }
  }

  private fadeCanvas(): void {
    const ctx = this.particleContext;
    if (ctx) {
      ctx.fillStyle = 'rgba(5, 8, 13, 0.08)';
      ctx.fillRect(0, 0, this.particleCanvas.nativeElement.width, this.particleCanvas.nativeElement.height);
    }
  }

  private getVelocityColor(speed: number): string {
    if (speed < 12) return 'rgba(56, 189, 248, 0.55)'; // cyan breeze
    if (speed < 25) return 'rgba(52, 211, 153, 0.65)'; // emerald
    if (speed < 42) return 'rgba(250, 204, 21, 0.75)'; // yellow
    if (speed < 62) return 'rgba(251, 146, 60, 0.85)'; // orange
    if (speed < 85) return 'rgba(244, 63, 94, 0.92)';  // crimson
    return 'rgba(236, 72, 153, 0.98)';                // storm magenta
  }

  private sampleWind(latitude: number, longitude: number, field: SampledWeatherPoint[]): SampledWeatherPoint {
    let best = field[0];
    let bestDistance = Infinity;

    for (const point of field) {
      const distance =
        Math.pow(point.latitude - latitude, 2) +
        Math.pow((point.longitude - longitude) * Math.cos(latitude * Math.PI / 180), 2);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }

    return best;
  }

  private resizeCanvas(): void {
    const canvas = this.particleCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.particleContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radius = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
