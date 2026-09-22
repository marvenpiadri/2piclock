import { Routes } from '@angular/router';
import { SkyHomeComponent } from './features/sky-view/sky-home';
import { WorldClocksComponent } from './features/world-clocks/world-clocks';
import { CelestialEphemerisComponent } from './features/celestial-ephemeris/celestial-ephemeris';
import { WeatherAtmosphereComponent } from './features/weather-atmosphere/weather-atmosphere';

export const routes: Routes = [
  { path: '', component: SkyHomeComponent, pathMatch: 'full' },
  { path: 'world-clocks', component: WorldClocksComponent },
  { path: 'ephemeris', component: CelestialEphemerisComponent },
  { path: 'atmosphere', component: WeatherAtmosphereComponent },
  { path: '**', redirectTo: '' }
];
