import { Injectable } from '@angular/core';
import * as Astronomy from 'astronomy-engine';
import * as SunCalc from 'suncalc';
import { PlanetaryPosition } from '../models/planetary.model';

export interface SolarCrossCheck {\n  astronomyEngineAltitudeDeg: number;\n  astronomyEngineAzimuthDeg: number;\n  sunCalcAltitudeDeg: number;\n  sunCalcAzimuthDeg: number;\n  altitudeDeltaDeg: number;\n  azimuthDeltaDeg: number;\n}\n\n@Injectable({ providedIn: 'root' })
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

  crossCheckSun(date: Date, latitude: number, longitude: number): SolarCrossCheck {
    const observer = new Astronomy.Observer(latitude, longitude, 0);
    const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
    const astronomyEngine = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
    const sunCalc = SunCalc.getPosition(date, latitude, longitude);
    const sunCalcAltitudeDeg = sunCalc.altitude * 180 / Math.PI;
    const sunCalcAzimuthDeg = (sunCalc.azimuth * 180 / Math.PI + 180 + 360) % 360;
    const azimuthDeltaDeg = Math.abs(((astronomyEngine.azimuth - sunCalcAzimuthDeg + 540) % 360) - 180);

    return {
      astronomyEngineAltitudeDeg: astronomyEngine.altitude,
      astronomyEngineAzimuthDeg: astronomyEngine.azimuth,
      sunCalcAltitudeDeg,
      sunCalcAzimuthDeg,
      altitudeDeltaDeg: Math.abs(astronomyEngine.altitude - sunCalcAltitudeDeg),
      azimuthDeltaDeg
    };
  }

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
