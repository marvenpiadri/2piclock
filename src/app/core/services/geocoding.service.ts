import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { GeoLocation } from '../models/location.model';

interface OpenMeteoGeocodingResult {
  id?: number;
  name?: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  timezone?: string;
  elevation?: number;
  admin1?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

interface RestCountryResult {
  name?: { common?: string };
  cca2?: string;
  latlng?: number[];
  timezones?: string[];
  capital?: string[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly cityEndpoint = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly countryEndpoint = 'https://restcountries.com/v3.1/name';
  private readonly cache = new Map<string, GeoLocation[]>();

  search(query: string, count = 8): Observable<GeoLocation[]> {
    const term = query.trim();
    if (term.length < 2) return of([]);

    const key = term.toLocaleLowerCase();
    const cached = this.cache.get(key);
    if (cached) return of(cached.slice(0, count));

    const cityParams = new HttpParams()
      .set('name', term)
      .set('count', Math.min(20, Math.max(1, count * 2)))
      .set('language', 'en')
      .set('format', 'json');

    const cities$ = this.http
      .get<OpenMeteoGeocodingResponse>(this.cityEndpoint, { params: cityParams })
      .pipe(
        map(response => (response.results ?? []).map((result, index) => this.mapCity(result, index))),
        catchError(() => of([]))
      );

    // REST Countries complements city geocoding with actual country records.
    // This prevents searches such as "Morocco" or "Japan" from depending on
    // whether the geocoder happens to rank a city highly enough.
    const countries$ = this.http
      .get<RestCountryResult[]>(`${this.countryEndpoint}/${encodeURIComponent(term)}`)
      .pipe(
        map(results => results.slice(0, 4).map((result, index) => this.mapCountry(result, index))),
        catchError(() => of([]))
      );

    return forkJoin({ cities: cities$, countries: countries$ }).pipe(
      map(({ cities, countries }) => {
        const merged = [...countries, ...cities];
        const seen = new Set<string>();
        const unique = merged.filter(location => {
          const key = [
            location.name.toLocaleLowerCase(),
            location.countryCode,
            location.latitude.toFixed(4),
            location.longitude.toFixed(4)
          ].join('|');

          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const limited = unique.slice(0, Math.min(20, Math.max(1, count)));
        this.cache.set(key, limited);
        return limited;
      })
    );
  }

  private mapCity(result: OpenMeteoGeocodingResult, index: number): GeoLocation {
    const countryCode = (result.country_code ?? '').toUpperCase();
    return {
      id: `geo-${result.id ?? (result.latitude + '-' + result.longitude)}-${index}`,
      name: result.name ?? 'Unknown location',
      country: result.country ?? result.admin1 ?? '',
      countryCode,
      flag: this.toFlag(countryCode),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone ?? 'UTC',
      elevationMeters: result.elevation,
      isCustom: true
    };
  }

  private mapCountry(result: RestCountryResult, index: number): GeoLocation {
    const name = result.name?.common ?? 'Unknown country';
    const countryCode = (result.cca2 ?? '').toUpperCase();
    const [latitude, longitude] = result.latlng ?? [0, 0];
    const timezone = result.timezones?.[0] ?? 'UTC';
    const capital = result.capital?.[0];

    return {
      id: `country-${countryCode || index}`,
      name: capital || name,
      country: name,
      countryCode,
      flag: this.toFlag(countryCode),
      latitude,
      longitude,
      timezone,
      isCustom: true
    };
  }

  private toFlag(countryCode?: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    return [...countryCode.toUpperCase()]
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }
}
