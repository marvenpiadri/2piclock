import { Routes } from '@angular/router';
import { SkyHomeComponent } from './features/sky-view/sky-home';
import { WorldClocksComponent } from './features/world-clocks/world-clocks';
import { WorldViewComponent } from './shared/components/world-view/world-view';
import { CelestialEphemerisComponent } from './features/celestial-ephemeris/celestial-ephemeris';
import { WeatherAtmosphereComponent } from './features/weather-atmosphere/weather-atmosphere';
import { WeatherViewComponent } from './features/weather-view/weather-view';
import { MeetingPlannerComponent } from './features/meeting-planner/meeting-planner';
import { SpaceViewComponent } from './shared/components/space-view/space-view';
import { TimeSuiteComponent } from './features/time-suite/time-suite';
import { AstronomySuiteComponent } from './features/astronomy-suite/astronomy-suite';
import { WorldRadioComponent } from './features/world-radio/world-radio';

export const routes: Routes = [
  { path: '', redirectTo: 'sky', pathMatch: 'full' },
  { path: 'sky', component: SkyHomeComponent, data: { skyPage: 'time' } },
  { path: 'sky/weather', component: SkyHomeComponent, data: { skyPage: 'weather' } },
  { path: 'sky/astronomy', component: SkyHomeComponent, data: { skyPage: 'astronomy' } },
  { path: 'sky/world', component: SkyHomeComponent, data: { skyPage: 'world' } },
  
  // World Radio routes
  { path: 'radio', component: WorldRadioComponent },
  { path: 'world-radio', redirectTo: 'radio', pathMatch: 'full' },
  
  // Time Product Suite routes
  { path: 'time', component: TimeSuiteComponent },
  { path: 'time-zone-converter', redirectTo: 'time?tab=converter', pathMatch: 'full' },
  { path: 'time-difference', redirectTo: 'time?tab=difference', pathMatch: 'full' },
  { path: 'time-duration', redirectTo: 'time?tab=duration', pathMatch: 'full' },
  { path: 'date-difference', redirectTo: 'time?tab=date-difference', pathMatch: 'full' },
  { path: 'add-subtract-time', redirectTo: 'time?tab=add-subtract', pathMatch: 'full' },
  { path: 'countdown', redirectTo: 'time?tab=countdown', pathMatch: 'full' },
  { path: 'count-up', redirectTo: 'time?tab=countdown', pathMatch: 'full' },
  { path: 'unix-timestamp', redirectTo: 'time?tab=unix', pathMatch: 'full' },

  // Astronomy Suite routes
  { path: 'astronomy-tools', component: AstronomySuiteComponent },
  { path: 'astronomy', redirectTo: 'astronomy-tools', pathMatch: 'full' },
  { path: 'solar-calculator', redirectTo: 'astronomy-tools?tab=solar', pathMatch: 'full' },
  { path: 'daylight-calculator', redirectTo: 'astronomy-tools?tab=daylight', pathMatch: 'full' },
  { path: 'moon-calculator', redirectTo: 'astronomy-tools?tab=moon', pathMatch: 'full' },
  { path: 'astronomical-events', redirectTo: 'astronomy-tools?tab=events', pathMatch: 'full' },
  { path: 'when-is', redirectTo: 'astronomy-tools?tab=events', pathMatch: 'full' },

  // World & Space routes
  { path: 'world', component: WorldViewComponent },
  { path: 'world-clocks', component: WorldClocksComponent },
  { path: 'space', component: SpaceViewComponent },
  { path: 'deep-space-observatory', redirectTo: 'space', pathMatch: 'full' },
  { path: 'atmosphere', component: WeatherAtmosphereComponent },
  { path: 'weather', component: WeatherViewComponent },
  { path: 'ephemeris', component: CelestialEphemerisComponent },
  { path: 'planner', component: MeetingPlannerComponent },
  { path: 'meeting-planner', redirectTo: 'planner', pathMatch: 'full' },
  { path: '**', redirectTo: 'sky' }
];
