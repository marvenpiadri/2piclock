import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WeatherCondition, WeatherData, WeatherOverrideConfig } from '../models/weather.model';
import { GeoLocation } from '../models/location.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly rawWeather = signal<WeatherData>(this.getDefaultWeatherData());
  readonly isLoading = signal<boolean>(false);
  readonly overrideConfig = signal<WeatherOverrideConfig>({ active: false });

  // Active combined weather accounting for manual overrides
  readonly currentWeather = computed<WeatherData>(() => {
    const raw = this.rawWeather();
    const ovr = this.overrideConfig();

    if (!ovr.active) {
      return raw;
    }

    const condition = ovr.condition || raw.condition;
    const cloudCoverPct = ovr.cloudCoverPct !== undefined ? ovr.cloudCoverPct : this.getConditionDefaultCloud(condition);
    const precipitationPct = ovr.precipitationPct !== undefined ? ovr.precipitationPct : this.getConditionDefaultPrecip(condition);

    return {
      ...raw,
      condition,
      conditionLabel: this.formatConditionLabel(condition),
      cloudCoverPct,
      precipitationPct,
      visibilityKm: condition === 'fog' ? 1.2 : (condition === 'heavy_rain' ? 3.5 : 16.0),
      isSimulated: true
    };
  });

  private lastFetchedKey = '';

  fetchWeatherForLocation(loc: GeoLocation): void {
    const key = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;
    if (this.lastFetchedKey === key && !this.rawWeather().isSimulated) {
      return;
    }

    if (!this.isBrowser) {
      this.rawWeather.set(this.generateRealisticWeather(loc));
      return;
    }

    this.isLoading.set(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility,uv_index&timezone=auto`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.isLoading.set(false);
        if (data && data.current) {
          const c = data.current;
          const condition = this.mapWmoCodeToCondition(c.weather_code);
          const tempC = c.temperature_2m || 20;
          const tempF = Math.round((tempC * 9 / 5 + 32) * 10) / 10;
          const feelsC = c.apparent_temperature || tempC;
          const feelsF = Math.round((feelsC * 9 / 5 + 32) * 10) / 10;

          const weather: WeatherData = {
            condition,
            conditionLabel: this.formatConditionLabel(condition),
            temperatureC: Math.round(tempC * 10) / 10,
            temperatureF: tempF,
            feelsLikeC: Math.round(feelsC * 10) / 10,
            feelsLikeF: feelsF,
            humidityPct: c.relative_humidity_2m || 50,
            cloudCoverPct: c.cloud_cover !== undefined ? c.cloud_cover : this.getConditionDefaultCloud(condition),
            precipitationPct: c.precipitation > 0 ? Math.min(100, Math.round(c.precipitation * 20)) : 0,
            windSpeedKmh: Math.round(c.wind_speed_10m || 10),
            windDirectionDeg: c.wind_direction_10m ?? 180,
            windGustKmh: Math.round(c.wind_gusts_10m || c.wind_speed_10m || 10),
            visibilityKm: Number.isFinite(c.visibility) ? Math.max(0.1, Math.round((c.visibility / 1000) * 10) / 10) : (condition === 'fog' ? 1.5 : (condition === 'heavy_rain' ? 4 : 18)),
            uvIndex: Number.isFinite(c.uv_index) ? Math.round(c.uv_index * 10) / 10 : 0,
            pressureHpa: Math.round(c.surface_pressure || 1013),
            dataSource: 'open-meteo',
            isSimulated: false,
            updatedAt: new Date()
          };

          this.rawWeather.set(weather);
          this.lastFetchedKey = key;
        } else {
          this.rawWeather.set(this.generateRealisticWeather(loc));
        }
      })
      .catch(() => {
        this.isLoading.set(false);
        this.rawWeather.set(this.generateRealisticWeather(loc));
      });
  }

  setOverride(config: Partial<WeatherOverrideConfig>): void {
    this.overrideConfig.update(prev => ({
      ...prev,
      ...config,
      active: true
    }));
  }

  clearOverride(): void {
    this.overrideConfig.set({ active: false });
  }

  private mapWmoCodeToCondition(code: number): WeatherCondition {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly_cloudy';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 65) return 'rain';
    if (code >= 66 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'heavy_rain';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'partly_cloudy';
  }

  private formatConditionLabel(c: WeatherCondition): string {
    switch (c) {
      case 'clear': return 'Clear Sky';
      case 'partly_cloudy': return 'Partly Cloudy';
      case 'cloudy': return 'Cloudy';
      case 'overcast': return 'Overcast';
      case 'rain': return 'Light Rain';
      case 'heavy_rain': return 'Heavy Rain';
      case 'thunderstorm': return 'Thunderstorm';
      case 'snow': return 'Snowfall';
      case 'fog': return 'Atmospheric Fog';
    }
  }

  private getConditionDefaultCloud(c: WeatherCondition): number {
    switch (c) {
      case 'clear': return 5;
      case 'partly_cloudy': return 40;
      case 'cloudy': return 75;
      case 'overcast': return 95;
      case 'rain': return 85;
      case 'heavy_rain': return 100;
      case 'thunderstorm': return 100;
      case 'snow': return 90;
      case 'fog': return 65;
    }
  }

  private getConditionDefaultPrecip(c: WeatherCondition): number {
    switch (c) {
      case 'rain': return 60;
      case 'heavy_rain': return 95;
      case 'thunderstorm': return 90;
      case 'snow': return 75;
      default: return 0;
    }
  }

  private generateRealisticWeather(loc: GeoLocation): WeatherData {
    const latAbs = Math.abs(loc.latitude);
    let tempC = 22 - (latAbs * 0.35);
    tempC = Math.round(tempC * 10) / 10;
    const tempF = Math.round((tempC * 9 / 5 + 32) * 10) / 10;

    return {
      condition: 'partly_cloudy',
      conditionLabel: 'Partly Cloudy',
      temperatureC: tempC,
      temperatureF: tempF,
      feelsLikeC: tempC,
      feelsLikeF: tempF,
      humidityPct: 58,
      cloudCoverPct: 35,
      precipitationPct: 0,
      windSpeedKmh: 14,
      windDirectionDeg: 210,
      visibilityKm: 16,
      uvIndex: 5,
      pressureHpa: 1014,
      dataSource: 'fallback',
      isSimulated: true,
      updatedAt: new Date()
    };
  }

  private getDefaultWeatherData(): WeatherData {
    return {
      condition: 'clear',
      conditionLabel: 'Clear Sky',
      temperatureC: 21.5,
      temperatureF: 70.7,
      feelsLikeC: 21.5,
      feelsLikeF: 70.7,
      humidityPct: 50,
      cloudCoverPct: 15,
      precipitationPct: 0,
      windSpeedKmh: 12,
      windDirectionDeg: 180,
      visibilityKm: 18,
      uvIndex: 5.2,
      pressureHpa: 1015,
      isSimulated: true,
      updatedAt: new Date()
    };
  }
}
