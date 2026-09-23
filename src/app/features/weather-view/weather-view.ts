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

type WeatherLayer = 'wind' | 'temperature' | 'rain' | 'clouds';

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
}

interface Particle {
  latitude: number;
  longitude: number;
  age: number;
}

@Component({
  selector: 'app-weather-view',
  standalone: true,
  imports: [CommonModule, MatIconModule],
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
  private readonly weatherService = inject(WeatherService);

  readonly selectedLocation = this.locationService.selectedLocation;
  readonly activeDate = this.timeControl.currentActiveDate;
  readonly liveWeather = this.weatherService.currentWeather;
  readonly activeLayer = signal<WeatherLayer>('wind');
  readonly isPlaying = signal(true);
  readonly particleSpeed = signal<1 | 2 | 4>(1);
  readonly isLoading = signal(false);
  readonly dataError = signal(false);
  readonly forecastIndex = signal(0);
  readonly forecastMax = signal(0);

  readonly layerOptions: { id: WeatherLayer; label: string; icon: string }[] = [
    { id: 'wind', label: 'Wind', icon: 'air' },
    { id: 'temperature', label: 'Temp', icon: 'device_thermostat' },
    { id: 'rain', label: 'Rain', icon: 'water_drop' },
    { id: 'clouds', label: 'Clouds', icon: 'cloud' }
  ];

  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private animationFrameId?: number;
  private lastFrame = 0;
  private fetchTimer?: ReturnType<typeof setTimeout>;
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
    return this.gridPoints.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      temperature: point.hourly.temperature_2m?.[index] ?? 0,
      precipitation: point.hourly.precipitation?.[index] ?? 0,
      cloudCover: point.hourly.cloud_cover?.[index] ?? 0,
      windSpeed: point.hourly.wind_speed_10m?.[index] ?? 0,
      windDirection: point.hourly.wind_direction_10m?.[index] ?? 0,
      gust: point.hourly.wind_gusts_10m?.[index] ?? 0
    }));
  });

  readonly layerTitle = computed(() => {
    switch (this.activeLayer()) {
      case 'temperature': return 'Temperature';
      case 'rain': return 'Precipitation';
      case 'clouds': return 'Cloud cover';
      default: return 'Wind';
    }
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
    this.map = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [loc.longitude, loc.latitude],
      zoom: 6,
      attributionControl: { compact: true }
    });

    this.map.addControl(new NavigationControl({ showCompass: false, showZoom: true }), 'bottom-right');

    this.map.on('load', () => {
      this.installWeatherSource();
      this.loadParticles();
      this.resizeCanvas();
      this.startAnimation();
      this.scheduleGridFetch(loc, true);
    });

    this.map.on('moveend', () => {
      const center = this.map?.getCenter();
      if (!center) return;
      const distance = this.distanceKm(center.lat, center.lng, loc.latitude, loc.longitude);
      if (distance > 180) {
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
  }

  ngOnDestroy(): void {
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  setLayer(layer: WeatherLayer): void {
    this.activeLayer.set(layer);
    this.updateWeatherSource();
  }

  togglePlay(): void {
    this.isPlaying.update(value => !value);
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
  }

  jumpForecast(offsetHours: number): void {
    const next = Math.max(0, Math.min(this.forecastMax(), this.forecastIndex() + offsetHours));
    this.forecastIndex.set(next);
    this.updateWeatherSource();
  }

  centerLocation(): void {
    const loc = this.selectedLocation();
    this.map?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 7, duration: 700 });
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
      .set('hourly', 'temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m')
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
        this.map?.flyTo({ center: [loc.longitude, loc.latitude], duration: 500 });
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
    const latRadius = zoom > 8 ? 0.8 : zoom > 6 ? 1.5 : 3;
    const cosLat = Math.max(0.2, Math.cos(latitude * Math.PI / 180));
    const lonRadius = latRadius / cosLat;
    const points: { latitude: number; longitude: number }[] = [];

    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        points.push({
          latitude: latitude + (y / 2) * latRadius,
          longitude: longitude + (x / 2) * lonRadius
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
        id: 'weather-field-circles',
        type: 'circle',
        source: 'weather-field',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 22, 9, 34],
          'circle-opacity': 0.34,
          'circle-blur': 0.85,
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

    if (this.map.getLayer('weather-field-circles')) {
      this.map.setPaintProperty(
        'weather-field-circles',
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
      default: return point.windSpeed;
    }
  }

  private layerColorExpression(): any {
    switch (this.activeLayer()) {
      case 'temperature':
        return ['interpolate', ['linear'], ['get', 'value'],
          -10, '#8b5cf6', 0, '#38bdf8', 10, '#22c55e', 20, '#fbbf24', 30, '#f97316', 40, '#ef4444'];
      case 'rain':
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#64748b', 0.5, '#38bdf8', 2, '#22c55e', 5, '#fbbf24', 10, '#f97316', 25, '#ef4444'];
      case 'clouds':
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#111827', 35, '#64748b', 70, '#cbd5e1', 100, '#f8fafc'];
      default:
        return ['interpolate', ['linear'], ['get', 'value'],
          0, '#94a3b8', 15, '#22c55e', 30, '#fbbf24', 50, '#f97316', 80, '#ef4444'];
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
    const latRadius = zoom > 8 ? 0.8 : zoom > 6 ? 1.5 : 3;
    const lonRadius = latRadius / Math.max(0.2, Math.cos(center.lat * Math.PI / 180));

    this.particles = Array.from({ length: 220 }, () => ({
      latitude: center.lat + (Math.random() * 2 - 1) * latRadius,
      longitude: center.lng + (Math.random() * 2 - 1) * lonRadius,
      age: Math.random()
    }));
  }

  private startAnimation(): void {
    if (!this.particleContext || !this.map) return;
    this.lastFrame = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(80, now - this.lastFrame);
      this.lastFrame = now;

      if (this.isPlaying()) this.renderParticles(dt);
      else this.clearParticles();

      this.animationFrameId = requestAnimationFrame(frame);
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  private renderParticles(dtMs: number): void {
    const canvas = this.particleCanvas.nativeElement;
    const ctx = this.particleContext;
    if (!ctx || !this.map) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const field = this.activeField();

    if (!field.length) return;

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,.52)';

    const stepHours = (dtMs / 3600000) * this.particleSpeed() * 3.2;

    for (const particle of this.particles) {
      const wind = this.sampleWind(particle.latitude, particle.longitude, field);
      const before = this.map.project([particle.longitude, particle.latitude]);
      const radians = wind.windDirection * Math.PI / 180;
      const north = Math.cos(radians) * wind.windSpeed * stepHours;
      const east = Math.sin(radians) * wind.windSpeed * stepHours;

      particle.latitude += north / 111;
      particle.longitude += east / (111 * Math.max(0.2, Math.cos(particle.latitude * Math.PI / 180)));
      particle.age += dtMs / 10000;

      const after = this.map.project([particle.longitude, particle.latitude]);

      if (
        particle.age > 1 ||
        after.x < -40 || after.y < -40 ||
        after.x > canvas.clientWidth + 40 ||
        after.y > canvas.clientHeight + 40
      ) {
        const center = this.map.getCenter();
        particle.latitude = center.lat + (Math.random() * 2 - 1) * 2;
        particle.longitude = center.lng + (Math.random() * 2 - 1) * 2;
        particle.age = 0;
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(before.x, before.y);
      ctx.lineTo(after.x, after.y);
      ctx.stroke();
    }
  }

  private clearParticles(): void {
    const ctx = this.particleContext;
    if (ctx) ctx.clearRect(0, 0, this.particleCanvas.nativeElement.width, this.particleCanvas.nativeElement.height);
  }

  private sampleWind(latitude: number, longitude: number, field: SampledWeatherPoint[]): SampledWeatherPoint {
    let best = field[0];
    let bestDistance = Infinity;

    for (const point of field) {
      const distance =
        Math.pow(point.latitude - latitude, 2) +
        Math.pow(
          (point.longitude - longitude) * Math.cos(latitude * Math.PI / 180),
          2
        );

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
