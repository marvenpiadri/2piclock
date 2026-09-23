export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'severe_thunderstorm'
  | 'snow'
  | 'heavy_snow'
  | 'blizzard'
  | 'fog'
  | 'haze';

export type WeatherAggressivenessLevel =
  | 'Calm'
  | 'Gentle'
  | 'Active'
  | 'Vigorous'
  | 'Severe Storm'
  | 'Violent Blizzard';

export interface WeatherAlert {
  id: string;
  severity: 'warning' | 'advisory' | 'watch';
  title: string;
  category: 'storm' | 'wind' | 'rain' | 'snow' | 'fog' | 'heat' | 'cold';
  description: string;
  issuedAt: Date;
  metricLabel?: string;
}

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
  aggressivenessIndex: number; // 0 to 100 severity rating
  aggressivenessLabel: WeatherAggressivenessLevel;
  lightningFrequencyPerMin?: number;
  winterFrostLevel?: number; // 0 to 100
  snowAccumulationCm?: number;
  dataSource?: 'open-meteo' | 'fallback' | 'simulation';
  isSimulated: boolean;
  updatedAt: Date;
}

export interface WeatherOverrideConfig {
  active: boolean;
  condition?: WeatherCondition;
  cloudCoverPct?: number;
  precipitationPct?: number;
  windSpeedKmh?: number;
  aggressivenessBoost?: number;
  fogDensity?: number;
}
