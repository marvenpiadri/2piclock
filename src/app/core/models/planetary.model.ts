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
