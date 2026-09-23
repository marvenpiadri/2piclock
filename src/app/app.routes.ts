import { Routes } from '@angular/router';
import { SkyHomeComponent } from './features/sky-view/sky-home';
import { WorldClocksComponent } from './features/world-clocks/world-clocks';
import { CelestialEphemerisComponent } from './features/celestial-ephemeris/celestial-ephemeris';
import { WeatherAtmosphereComponent } from './features/weather-atmosphere/weather-atmosphere';
import { MeetingPlannerComponent } from './features/meeting-planner/meeting-planner';
import { SpaceViewComponent } from './shared/components/space-view/space-view';

export const routes: Routes = [
  { path: '', redirectTo: 'sky', pathMatch: 'full' },
  { path: 'sky', component: SkyHomeComponent },
  { path: 'world', component: WorldClocksComponent },
  { path: 'world-clocks', redirectTo: 'world', pathMatch: 'full' },
  { path: 'space', component: SpaceViewComponent },
  { path: 'deep-space-observatory', redirectTo: 'space', pathMatch: 'full' },
  { path: 'atmosphere', component: WeatherAtmosphereComponent },
  { path: 'ephemeris', component: CelestialEphemerisComponent },
  { path: 'planner', component: MeetingPlannerComponent },
  { path: 'meeting-planner', redirectTo: 'planner', pathMatch: 'full' },
  { path: '**', redirectTo: 'sky' }
];
