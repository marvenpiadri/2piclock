import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'https://geocoding-api.open-meteo.com/v1/search';

  search(query: string, count = 8): Observable<GeoLocation[]> {
    const term = query.trim();
    if (term.length < 2) return of([]);

    const params = new HttpParams()
      .set('name', term)
      .set('count', Math.min(20, Math.max(1, count)))
      .set('language', 'en')
      .set('format', 'json');

    return this.http.get<OpenMeteoGeocodingResponse>(this.endpoint, { params }).pipe(
      map(response => (response.results ?? []).map((result, index) => ({
        id: 'geo-' + (result.id ?? (result.latitude + '-' + result.longitude)) + '-' + index,
        name: result.name ?? 'Unknown location',
        country: result.country ?? result.admin1 ?? '',
        countryCode: (result.country_code ?? '').toUpperCase(),
        flag: this.toFlag(result.country_code),
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone ?? 'UTC',
        elevationMeters: result.elevation,
        isCustom: true
      }))),
      catchError(() => of([]))
    );
  }

  private toFlag(countryCode?: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    return [...countryCode.toUpperCase()]
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }
}
