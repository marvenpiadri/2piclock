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
  cloudCoverPct: number; // 0 to 100
  precipitationPct: number; // 0 to 100
  windSpeedKmh: number;
  windDirectionDeg: number;
  visibilityKm: number;
  uvIndex: number;
  pressureHpa: number;
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
