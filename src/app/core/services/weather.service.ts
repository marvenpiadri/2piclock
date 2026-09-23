import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { WeatherAggressivenessLevel, WeatherCondition, WeatherData, WeatherOverrideConfig } from '../models/weather.model';
import { GeoLocation } from '../models/location.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
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
    const windSpeedKmh = ovr.windSpeedKmh !== undefined ? ovr.windSpeedKmh : (condition === 'blizzard' ? 55 : ((condition === 'severe_thunderstorm' || condition === 'thunderstorm') ? 42 : raw.windSpeedKmh));
    const windGustKmh = Math.round(windSpeedKmh * 1.45);

    const { score, label } = this.calculateAggressiveness(condition, windSpeedKmh, windGustKmh, precipitationPct, raw.temperatureC);

    return {
      ...raw,
      condition,
      conditionLabel: this.formatConditionLabel(condition),
      cloudCoverPct,
      precipitationPct,
      windSpeedKmh,
      windGustKmh,
      aggressivenessIndex: Math.min(100, Math.max(0, score + (ovr.aggressivenessBoost || 0))),
      aggressivenessLabel: label,
      lightningFrequencyPerMin: (condition === 'severe_thunderstorm' ? 18 : (condition === 'thunderstorm' ? 8 : 0)),
      winterFrostLevel: raw.temperatureC <= 0 ? Math.min(100, Math.round((0 - raw.temperatureC) * 5 + 30)) : 0,
      visibilityKm: condition === 'fog' ? 1.2 : (condition === 'blizzard' ? 1.5 : (condition === 'heavy_rain' ? 3.5 : 16.0)),
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
    const params = new HttpParams()
      .set('latitude', loc.latitude)
      .set('longitude', loc.longitude)
      .set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility,uv_index')
      .set('timezone', 'auto');

    this.http.get<any>('https://api.open-meteo.com/v1/forecast', { params })
      .subscribe({
        next: (data) => {
          this.isLoading.set(false);
          if (data && data.current) {
            const c = data.current;
            const condition = this.mapWmoCodeToCondition(c.weather_code);
            const tempC = c.temperature_2m || 20;
            const tempF = Math.round((tempC * 9 / 5 + 32) * 10) / 10;
            const feelsC = c.apparent_temperature || tempC;
            const feelsF = Math.round((feelsC * 9 / 5 + 32) * 10) / 10;
            const windSpeedKmh = Math.round(c.wind_speed_10m || 10);
            const windGustKmh = Math.round(c.wind_gusts_10m || c.wind_speed_10m || 10);
            const precipitationPct = c.precipitation > 0 ? Math.min(100, Math.round(c.precipitation * 20)) : 0;

            const { score, label } = this.calculateAggressiveness(condition, windSpeedKmh, windGustKmh, precipitationPct, tempC);

            const weather: WeatherData = {
              condition,
              conditionLabel: this.formatConditionLabel(condition),
              temperatureC: Math.round(tempC * 10) / 10,
              temperatureF: tempF,
              feelsLikeC: Math.round(feelsC * 10) / 10,
              feelsLikeF: feelsF,
              humidityPct: c.relative_humidity_2m || 50,
              cloudCoverPct: c.cloud_cover !== undefined ? c.cloud_cover : this.getConditionDefaultCloud(condition),
              precipitationPct,
              windSpeedKmh,
              windDirectionDeg: c.wind_direction_10m ?? 180,
              windGustKmh,
              visibilityKm: Number.isFinite(c.visibility) ? Math.max(0.1, Math.round((c.visibility / 1000) * 10) / 10) : (condition === 'fog' ? 1.5 : (condition === 'heavy_rain' ? 4 : 18)),
              uvIndex: Number.isFinite(c.uv_index) ? Math.round(c.uv_index * 10) / 10 : 0,
              pressureHpa: Math.round(c.surface_pressure || 1013),
              aggressivenessIndex: score,
              aggressivenessLabel: label,
              lightningFrequencyPerMin: condition === 'thunderstorm' ? 6 : 0,
              winterFrostLevel: tempC <= 0 ? Math.min(100, Math.round((0 - tempC) * 5 + 30)) : 0,
              snowAccumulationCm: (condition === 'snow' || condition === 'blizzard') ? (condition === 'blizzard' ? 18 : 4) : 0,
              dataSource: 'open-meteo',
              isSimulated: false,
              updatedAt: new Date()
            };

            this.rawWeather.set(weather);
            this.lastFetchedKey = key;
          } else {
            this.rawWeather.set(this.generateRealisticWeather(loc));
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.rawWeather.set(this.generateRealisticWeather(loc));
        }
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

  private calculateAggressiveness(
    cond: WeatherCondition,
    windKmh: number,
    gustKmh: number,
    precipPct: number,
    tempC: number
  ): { score: number; label: WeatherAggressivenessLevel } {
    let base = 10;
    if (cond === 'clear') base = 5;
    else if (cond === 'haze') base = 20;
    else if (cond === 'partly_cloudy') base = 15;
    else if (cond === 'cloudy' || cond === 'overcast') base = 25;
    else if (cond === 'fog') base = 35;
    else if (cond === 'drizzle') base = 30;
    else if (cond === 'rain') base = 45;
    else if (cond === 'snow') base = 50;
    else if (cond === 'heavy_snow') base = 72;
    else if (cond === 'heavy_rain') base = 70;
    else if (cond === 'blizzard') base = 85;
    else if (cond === 'thunderstorm') base = 88;
    else if (cond === 'severe_thunderstorm') base = 96;

    // Wind component
    const windScore = Math.min(30, (windKmh / 60) * 20 + (gustKmh / 80) * 10);
    // Precip component
    const precipScore = (precipPct / 100) * 15;
    // Cold winter intensity factor
    const freezeScore = tempC < -5 ? Math.min(15, (-5 - tempC) * 0.8) : 0;

    const total = Math.min(100, Math.round(base + windScore + precipScore + freezeScore));

    let label: WeatherAggressivenessLevel = 'Calm';
    if (total >= 85) label = cond === 'blizzard' || cond === 'heavy_snow' || tempC < -5 ? 'Violent Blizzard' : 'Severe Storm';
    else if (total >= 65) label = 'Severe Storm';
    else if (total >= 45) label = 'Vigorous';
    else if (total >= 30) label = 'Active';
    else if (total >= 15) label = 'Gentle';
    else label = 'Calm';

    return { score: total, label };
  }

  private mapWmoCodeToCondition(code: number): WeatherCondition {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly_cloudy';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if (code >= 58 && code <= 65) return 'rain';
    if (code >= 66 && code <= 67) return 'rain';
    if (code >= 71 && code <= 75) return 'snow';
    if (code >= 76 && code <= 77) return 'heavy_snow';
    if (code >= 80 && code <= 82) return 'heavy_rain';
    if (code >= 85 && code <= 86) return 'blizzard';
    if (code === 95) return 'thunderstorm';
    if (code >= 96 && code <= 99) return 'severe_thunderstorm';
    return 'partly_cloudy';
  }

  private formatConditionLabel(c: WeatherCondition): string {
    switch (c) {
      case 'clear': return 'Clear Sky';
      case 'partly_cloudy': return 'Partly Cloudy';
      case 'cloudy': return 'Cloudy';
      case 'overcast': return 'Overcast';
      case 'drizzle': return 'Drizzle';
      case 'rain': return 'Rain';
      case 'heavy_rain': return 'Heavy Downpour';
      case 'thunderstorm': return 'Thunderstorm & Lightning';
      case 'severe_thunderstorm': return 'Severe Thunderstorm';
      case 'snow': return 'Snowfall';
      case 'heavy_snow': return 'Heavy Snow';
      case 'blizzard': return 'Winter Blizzard';
      case 'fog': return 'Atmospheric Fog';
      case 'haze': return 'Haze';
      default: return 'Clear Sky';
    }
  }

  private getConditionDefaultCloud(c: WeatherCondition): number {
    switch (c) {
      case 'clear': return 5;
      case 'haze': return 30;
      case 'partly_cloudy': return 40;
      case 'cloudy': return 75;
      case 'overcast': return 95;
      case 'drizzle': return 65;
      case 'rain': return 85;
      case 'heavy_rain': return 100;
      case 'thunderstorm': return 100;
      case 'severe_thunderstorm': return 100;
      case 'snow': return 90;
      case 'heavy_snow': return 100;
      case 'blizzard': return 100;
      case 'fog': return 65;
      default: return 20;
    }
  }

  private getConditionDefaultPrecip(c: WeatherCondition): number {
    switch (c) {
      case 'drizzle': return 35;
      case 'rain': return 60;
      case 'heavy_rain': return 95;
      case 'thunderstorm': return 92;
      case 'severe_thunderstorm': return 100;
      case 'snow': return 75;
      case 'heavy_snow': return 92;
      case 'blizzard': return 98;
      default: return 0;
    }
  }

  private generateRealisticWeather(loc: GeoLocation): WeatherData {
    const latAbs = Math.abs(loc.latitude);
    let tempC = 22 - (latAbs * 0.35);
    tempC = Math.round(tempC * 10) / 10;
    const tempF = Math.round((tempC * 9 / 5 + 32) * 10) / 10;
    const windSpeedKmh = 14;
    const windGustKmh = 22;

    const { score, label } = this.calculateAggressiveness('partly_cloudy', windSpeedKmh, windGustKmh, 0, tempC);

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
      windSpeedKmh,
      windDirectionDeg: 210,
      windGustKmh,
      visibilityKm: 16,
      uvIndex: 5,
      pressureHpa: 1014,
      aggressivenessIndex: score,
      aggressivenessLabel: label,
      lightningFrequencyPerMin: 0,
      winterFrostLevel: tempC <= 0 ? 40 : 0,
      snowAccumulationCm: 0,
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
      windGustKmh: 16,
      visibilityKm: 18,
      uvIndex: 5.2,
      pressureHpa: 1015,
      aggressivenessIndex: 12,
      aggressivenessLabel: 'Calm',
      lightningFrequencyPerMin: 0,
      winterFrostLevel: 0,
      snowAccumulationCm: 0,
      isSimulated: true,
      updatedAt: new Date()
    };
  }
}
