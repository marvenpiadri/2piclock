import { Injectable } from '@angular/core';
import * as Astronomy from 'astronomy-engine';

export interface PlanetaryPosition {
  body: Astronomy.Body;
  name: string;
  altitudeDeg: number;
  azimuthDeg: number;
  rightAscensionHours: number;
  declinationDeg: number;
  distanceAu: number;
  magnitude: number;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class PrecisionAstronomyService {
  readonly planets: readonly { body: Astronomy.Body; name: string }[] = [
    { body: Astronomy.Body.Mercury, name: 'Mercury' },
    { body: Astronomy.Body.Venus, name: 'Venus' },
    { body: Astronomy.Body.Mars, name: 'Mars' },
    { body: Astronomy.Body.Jupiter, name: 'Jupiter' },
    { body: Astronomy.Body.Saturn, name: 'Saturn' },
    { body: Astronomy.Body.Uranus, name: 'Uranus' },
    { body: Astronomy.Body.Neptune, name: 'Neptune' }
  ];

  getPlanetaryPositions(date: Date, latitude: number, longitude: number, elevationMeters = 0): PlanetaryPosition[] {
    const observer = new Astronomy.Observer(latitude, longitude, elevationMeters);

    return this.planets.map(({ body, name }) => {
      const equator = Astronomy.Equator(body, date, observer, true, true);
      const horizontal = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
      const distanceAu = Astronomy.GeoVector(body, date, true).Length();
      const illumination = Astronomy.Illumination(body, date);

      return {
        body,
        name,
        altitudeDeg: horizontal.altitude,
        azimuthDeg: horizontal.azimuth,
        rightAscensionHours: equator.ra,
        declinationDeg: equator.dec,
        distanceAu,
        magnitude: illumination.mag,
        visible: horizontal.altitude > 0
      };
    });
  }

  getRiseSet(body: Astronomy.Body, date: Date, latitude: number, longitude: number, elevationMeters = 0): {
    rise: Date | null;
    set: Date | null;
  } {
    const observer = new Astronomy.Observer(latitude, longitude, elevationMeters);
    const rise = Astronomy.SearchRiseSet(body, observer, +1, date, 1);
    const set = Astronomy.SearchRiseSet(body, observer, -1, date, 1);
    return {
      rise: rise?.date ?? null,
      set: set?.date ?? null
    };
  }
}
