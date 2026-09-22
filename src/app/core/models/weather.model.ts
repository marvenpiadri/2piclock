export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog';

export interface WeatherData {
  condition: WeatherCondition;
  conditionLabel: string;
  temperatureC: number;
  temperatureF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  humidityPct: number;
  cloudCoverPct: number;
  precipitationPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustKmh?: number;
  visibilityKm: number;
  uvIndex: number;
  pressureHpa: number;
  dataSource?: 'open-meteo' | 'fallback' | 'simulation';
  isSimulated: boolean;
  updatedAt: Date;
}

export interface WeatherOverrideConfig {
  active: boolean;
  condition?: WeatherCondition;
  cloudCoverPct?: number;
  precipitationPct?: number;
  fogDensity?: number;
}