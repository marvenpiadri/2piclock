export interface GeoLocation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevationMeters?: number;
  isCustom?: boolean;
}

export const PRESET_LOCATIONS: GeoLocation[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    elevationMeters: 40
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    flag: '🇬🇧',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    elevationMeters: 25
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    elevationMeters: 10
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    flag: '🇫🇷',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    elevationMeters: 35
  },
  {
    id: 'casablanca',
    name: 'Casablanca',
    country: 'Morocco',
    countryCode: 'MA',
    flag: '🇲🇦',
    latitude: 33.5731,
    longitude: -7.5898,
    timezone: 'Africa/Casablanca',
    elevationMeters: 20
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    flag: '🇦🇺',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    elevationMeters: 19
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    flag: '🇪🇬',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
    elevationMeters: 23
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    countryCode: 'IS',
    flag: '🇮🇸',
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    elevationMeters: 15
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    flag: '🇦🇪',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    elevationMeters: 5
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    flag: '🇸🇬',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
    elevationMeters: 15
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    elevationMeters: 89
  },
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    flag: '🇧🇷',
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: 'America/Sao_Paulo',
    elevationMeters: 760
  },
  {
    id: 'tromso',
    name: 'Tromsø',
    country: 'Norway',
    countryCode: 'NO',
    flag: '🇳🇴',
    latitude: 69.6492,
    longitude: 18.9553,
    timezone: 'Europe/Oslo',
    elevationMeters: 20
  },
  {
    id: 'honolulu',
    name: 'Honolulu',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    latitude: 21.3069,
    longitude: -157.8583,
    timezone: 'Pacific/Honolulu',
    elevationMeters: 6
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    countryCode: 'ZA',
    flag: '🇿🇦',
    latitude: -33.9249,
    longitude: 18.4241,
    timezone: 'Africa/Johannesburg',
    elevationMeters: 25
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    elevationMeters: 14
  }
];
