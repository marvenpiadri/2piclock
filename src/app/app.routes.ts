import { Routes, CanActivateFn, Router, inject } from '@angular/router';
import { LocationService } from './core/services/location.service';
import { SkyHomeComponent } from './features/sky-view/sky-home';
import { WorldClocksComponent } from './features/world-clocks/world-clocks';
import { WorldViewComponent } from './shared/components/world-view/world-view';
import { CelestialEphemerisComponent } from './features/celestial-ephemeris/celestial-ephemeris';
import { WeatherAtmosphereComponent } from './features/weather-atmosphere/weather-atmosphere';
import { MeetingPlannerComponent } from './features/meeting-planner/meeting-planner';
import { SpaceViewComponent } from './shared/components/space-view/space-view';
import { TimeSuiteComponent } from './features/time-suite/time-suite';
import { AstronomySuiteComponent } from './features/astronomy-suite/astronomy-suite';
import { WorldRadioComponent } from './features/world-radio/world-radio';
import { SeoPlaceToolComponent } from './features/seo-place-tool/seo-place-tool';

const resolveRootLocation: CanActivateFn = async () => {
  const locationService = inject(LocationService);
  const router = inject(Router);
  const location = await locationService.ensureInitialLocation();
  return router.createUrlTree(['/', location.id]);
};

export const routes: Routes = [
  // The root is the entry point only. Resolve a concrete location before rendering
  // the living experience so every normal page has a stable /:location URL.
  { path: '', pathMatch: 'full', canActivate: [resolveRootLocation], component: SkyHomeComponent, data: { skyPage: 'time' } },
  { path: 'now', redirectTo: '', pathMatch: 'full' },
  { path: 'weather', component: SkyHomeComponent, data: { skyPage: 'weather' } },
  { path: 'astronomy', component: AstronomySuiteComponent },
  { path: 'tonight', component: SkyHomeComponent, data: { skyPage: 'tonight' } },
  { path: 'sky', redirectTo: 'now', pathMatch: 'full' },
  { path: 'sky/weather', redirectTo: 'weather', pathMatch: 'full' },
  { path: 'sky/astronomy', redirectTo: 'astronomy', pathMatch: 'full' },
  { path: 'sky/world', redirectTo: 'world', pathMatch: 'full' },
  
  // World Radio routes
  { path: 'radio', component: WorldRadioComponent },
  { path: 'world-radio', redirectTo: 'radio', pathMatch: 'full' },
  
  // Time Product Suite routes
  { path: 'time', component: TimeSuiteComponent },
  { path: 'time-zone-converter', redirectTo: 'time?tab=converter', pathMatch: 'full' },
  { path: 'time-in', redirectTo: 'time?tab=converter', pathMatch: 'full' },
  { path: 'time-difference', redirectTo: 'time?tab=difference', pathMatch: 'full' },
  { path: 'time-duration', redirectTo: 'time?tab=duration', pathMatch: 'full' },
  { path: 'date-difference', redirectTo: 'time?tab=date-difference', pathMatch: 'full' },
  { path: 'add-subtract-time', redirectTo: 'time?tab=add-subtract', pathMatch: 'full' },
  { path: 'countdown', redirectTo: 'time?tab=countdown', pathMatch: 'full' },
  { path: 'count-up', redirectTo: 'time?tab=countdown', pathMatch: 'full' },
  { path: 'unix-timestamp', redirectTo: 'time?tab=unix', pathMatch: 'full' },

  // Astronomy Suite routes
  { path: 'astronomy-tools', redirectTo: 'astronomy', pathMatch: 'full' },
  { path: 'solar-calculator', redirectTo: 'astronomy?tab=solar', pathMatch: 'full' },
  { path: 'daylight-calculator', redirectTo: 'astronomy?tab=daylight', pathMatch: 'full' },
  { path: 'sunrise', redirectTo: 'astronomy?tab=daylight', pathMatch: 'full' },
  { path: 'sunset', redirectTo: 'astronomy?tab=daylight', pathMatch: 'full' },
  { path: 'golden-hour', redirectTo: 'astronomy?tab=daylight', pathMatch: 'full' },
  { path: 'twilight', redirectTo: 'astronomy?tab=daylight', pathMatch: 'full' },
  { path: 'moon-calculator', redirectTo: 'astronomy?tab=moon', pathMatch: 'full' },
  { path: 'moon-phase', redirectTo: 'astronomy?tab=moon', pathMatch: 'full' },
  { path: 'moonrise', redirectTo: 'astronomy?tab=moon', pathMatch: 'full' },
  { path: 'moonset', redirectTo: 'astronomy?tab=moon', pathMatch: 'full' },
  { path: 'astronomical-events', redirectTo: 'astronomy?tab=events', pathMatch: 'full' },
  { path: 'when-is', redirectTo: 'astronomy?tab=events', pathMatch: 'full' },

  // World & Space routes
  { path: 'world', component: WorldViewComponent },
  { path: 'world-clocks', component: WorldClocksComponent },
  { path: 'world-clock', redirectTo: 'world-clocks', pathMatch: 'full' },
  { path: 'space', component: SpaceViewComponent },
  { path: 'deep-space-observatory', redirectTo: 'space', pathMatch: 'full' },
  { path: 'atmosphere', component: WeatherAtmosphereComponent },
  { path: 'weather-forecast', redirectTo: 'weather', pathMatch: 'full' },
  { path: 'ephemeris', component: CelestialEphemerisComponent },
  { path: 'planner', component: MeetingPlannerComponent },
  // Legacy focused SEO routes redirect into the location-first hierarchy.
  { path: 'time/:slug', redirectTo: ({ params }) => `/${params['slug']}/time` },
  { path: 'sun/:slug', redirectTo: ({ params }) => `/${params['slug']}/sun` },
  { path: 'moon/:slug', redirectTo: ({ params }) => `/${params['slug']}/moon` },
  { path: 'tonight/:slug', redirectTo: ({ params }) => `/${params['slug']}/tonight` },

  // Location-first living experience. Keep these after all static and legacy
  // routes because Angular uses first-match routing.
  { path: ':location/weather', component: SkyHomeComponent, data: { skyPage: 'weather' } },
  { path: ':location/time', component: SkyHomeComponent, data: { skyPage: 'time' } },
  { path: ':location/tonight', component: SkyHomeComponent, data: { skyPage: 'tonight' } },
  { path: ':location/sun', component: AstronomySuiteComponent, data: { tab: 'daylight' } },
  { path: ':location/moon', component: AstronomySuiteComponent, data: { tab: 'moon' } },
  { path: ':location/astronomy', component: AstronomySuiteComponent, data: { tab: 'overview' } },
  { path: ':location', component: SkyHomeComponent, data: { skyPage: 'time' } },
  { path: 'meeting-planner', redirectTo: 'planner', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
