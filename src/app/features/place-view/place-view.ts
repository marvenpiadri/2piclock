import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { LocationService } from '../../core/services/location.service';
import { WeatherService } from '../../core/services/weather.service';
import { AstronomicalCalculatorService } from '../../core/services/astronomical-calculator.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { GeoLocation } from '../../core/models/location.model';
import { MoonPhaseIndicator } from '../../shared/components/moon-phase-indicator/moon-phase-indicator';

@Component({ selector: 'app-place-view', standalone: true, imports: [CommonModule, RouterModule, MoonPhaseIndicator], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './place-view.html', styleUrl: './place-view.css' })
export class PlaceViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly locationService = inject(LocationService);
  readonly weatherService = inject(WeatherService);
  private readonly astronomy = inject(AstronomicalCalculatorService);
  private readonly timeControl = inject(TimeControlService);
  readonly location = computed<GeoLocation | null>(() => { const slug = this.route.snapshot.paramMap.get('slug')?.toLowerCase(); return this.locationService.allPresets.find(p => p.id === slug) ?? null; });
  readonly activeDate = this.timeControl.currentActiveDate;
  readonly solar = computed(() => { const loc = this.location(); return loc ? this.astronomy.calculateSolar(loc, this.activeDate()) : null; });
  readonly daylight = computed(() => { const loc = this.location(); return loc ? this.astronomy.calculateDaylight(loc, this.activeDate()) : null; });
  readonly moon = computed(() => { const loc = this.location(); return loc ? this.astronomy.calculateMoon(loc, this.activeDate()) : null; });
  readonly nextEvents = computed(() => { const loc = this.location(); return loc ? this.astronomy.calculateYearlyEvents(this.activeDate().getFullYear(), loc).filter(event => event.isUpcoming).slice(0, 4) : []; });
  readonly localTime = computed(() => { const loc = this.location(); return loc ? this.activeDate().toLocaleTimeString('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'; });
  readonly localDate = computed(() => { const loc = this.location(); return loc ? this.activeDate().toLocaleDateString('en-US', { timeZone: loc.timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''; });
  readonly utcOffset = computed(() => { const loc = this.location(); if (!loc) return ''; try { const formatted = new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, timeZoneName: 'shortOffset' }).format(this.activeDate()); return formatted.split(' ').pop() ?? loc.timezone; } catch { return loc.timezone; } });
  constructor() { effect(() => { const loc = this.location(); if (!loc) return; this.locationService.selectLocation(loc); this.weatherService.fetchWeatherForLocation(loc); this.updateSeo(loc); }); }
  private updateSeo(loc: GeoLocation): void {
    const title = loc.name + ', ' + loc.country + ' — Time, Weather & Sky | 2PiClock';
    const description = 'Current local time, sunrise, sunset, daylight, moon phase, weather and astronomical calculations for ' + loc.name + ', ' + loc.country + '. Explore the sky, weather and time tools for ' + loc.name + '.';
    const canonicalUrl = 'https://2piclock.com/place/' + loc.id;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    const canonical = this.document.querySelector('link[rel="canonical"]') ?? this.document.createElement('link');
    canonical.setAttribute('rel', 'canonical'); canonical.setAttribute('href', canonicalUrl);
    if (!canonical.parentNode) this.document.head.appendChild(canonical);
    this.document.getElementById('place-jsonld')?.remove();
    const script = this.document.createElement('script'); script.id = 'place-jsonld'; script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl, about: { '@type': 'City', name: loc.name, containedInPlace: { '@type': 'Country', name: loc.country } } });
    this.document.head.appendChild(script);
  }
  readonly sunVisualPosition = computed(() => {
    const az = this.solar()?.solarPos?.azimuthDeg ?? 0;
    return { left: 50 + Math.sin(az * Math.PI / 180) * 42, top: 50 - Math.cos(az * Math.PI / 180) * 42 };
  });

  formatTime(date: Date | null): string { const loc = this.location(); return !date || !loc ? '--:--' : date.toLocaleTimeString('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', hour12: false }); }
  formatDegrees(value: number | undefined): string { return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(1) + '°'; }
  formatMoonPhase(): string { return this.moon()?.sublunarPoint.phaseName ?? '—'; }
}