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

const resolveRootLocation: CanActivateFn = async () => {
  const locationService = inject(LocationService);
  const router = inject(Router);
  const location = await locationService.ensureInitialLocation();
  return router.createUrlTree(['/', location.id]);
};

const validLocationGuard: CanActivateFn = (route) => {
  const locationService = inject(LocationService);
  const router = inject(Router);
  const slug = route.paramMap.get('location');
  const validPreset = !!slug && locationService.allPresets.some(loc => loc.id === slug);
  const validCurrent = slug === locationService.selectedLocation().id;
  return validPreset || validCurrent ? true : router.createUrlTree(['/']);
};

export const routes: Routes = [
  // The root is the entry point only. Resolve a concrete location before rendering
  // the living experience so every normal page has a stable /:location URL.
  { path: '', pathMatch: 'full', canActivate: [resolveRootLocation], component: SkyHomeComponent, data: { skyPage: 'time' } },
  { path: 'weather', component: SkyHomeComponent, data: { skyPage: 'weather' } },
  { path: 'astronomy', component: AstronomySuiteComponent },
  { path: 'tonight', component: SkyHomeComponent, data: { skyPage: 'tonight' } },
    
  // World Radio routes
  { path: 'radio', component: WorldRadioComponent },
  
  // Time Product Suite routes
  { path: 'time', component: TimeSuiteComponent },


  // World & Space routes
  { path: 'world', component: WorldViewComponent },
  { path: 'world-clocks', component: WorldClocksComponent },
  { path: 'space', component: SpaceViewComponent },
  { path: 'atmosphere', component: WeatherAtmosphereComponent },
  { path: 'ephemeris', component: CelestialEphemerisComponent },
  { path: 'planner', component: MeetingPlannerComponent },
  // Location-first living experience.
  { path: ':location/weather', component: SkyHomeComponent, canActivate: [validLocationGuard], data: { skyPage: 'weather' } },
  { path: ':location/time', component: SkyHomeComponent, canActivate: [validLocationGuard], data: { skyPage: 'time' } },
  { path: ':location/tonight', component: SkyHomeComponent, canActivate: [validLocationGuard], data: { skyPage: 'tonight' } },
  { path: ':location/sun', component: AstronomySuiteComponent, canActivate: [validLocationGuard], data: { tab: 'daylight' } },
  { path: ':location/moon', component: AstronomySuiteComponent, canActivate: [validLocationGuard], data: { tab: 'moon' } },
  { path: ':location/astronomy', component: AstronomySuiteComponent, canActivate: [validLocationGuard], data: { tab: 'overview' } },
  { path: ':location', component: SkyHomeComponent, canActivate: [validLocationGuard], data: { skyPage: 'time' } },
  { path: '**', redirectTo: '' }
];
