import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { LocationService } from '../../core/services/location.service';
import { AstronomicalCalculatorService } from '../../core/services/astronomical-calculator.service';
import { WeatherService } from '../../core/services/weather.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { GeoLocation } from '../../core/models/location.model';
import { MoonPhaseIndicator } from '../../shared/components/moon-phase-indicator/moon-phase-indicator';

type ToolKind = 'time' | 'sun' | 'moon' | 'tonight';

@Component({
  selector: 'app-seo-place-tool',
  standalone: true,
  imports: [CommonModule, RouterModule, MoonPhaseIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seo-place-tool.html',
  styleUrl: './seo-place-tool.css'
})
export class SeoPlaceToolComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly locationService = inject(LocationService);
  readonly weatherService = inject(WeatherService);
  private readonly astronomy = inject(AstronomicalCalculatorService);
  private readonly timeControl = inject(TimeControlService);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly kind = computed<ToolKind>(() => (this.routeData()['tool'] ?? 'time') as ToolKind);
  readonly slug = computed(() => this.routeParams().get('slug')?.toLowerCase() ?? '');
  readonly location = computed<GeoLocation | null>(() => this.locationService.allPresets.find(p => p.id === this.slug()) ?? null);
  readonly activeDate = this.timeControl.currentActiveDate;
  readonly solar = computed(() => {
    const loc = this.location();
    return loc ? this.astronomy.calculateSolar(loc, this.activeDate()) : null;
  });
  readonly daylight = computed(() => {
    const loc = this.location();
    return loc ? this.astronomy.calculateDaylight(loc, this.activeDate()) : null;
  });
  readonly moon = computed(() => {
    const loc = this.location();
    return loc ? this.astronomy.calculateMoon(loc, this.activeDate()) : null;
  });
  readonly localTime = computed(() => {
    const loc = this.location();
    return loc ? this.activeDate().toLocaleTimeString('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--';
  });
  readonly localDate = computed(() => {
    const loc = this.location();
    return loc ? this.activeDate().toLocaleDateString('en-US', { timeZone: loc.timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
  });
  readonly utcOffset = computed(() => {
    const loc = this.location();
    if (!loc) return '';
    return new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, timeZoneName: 'shortOffset' })
      .formatToParts(this.activeDate()).find(part => part.type === 'timeZoneName')?.value ?? loc.timezone;
  });
  readonly sunPosition = computed(() => this.solar()?.solarPos ?? null);
  readonly sunDirection = computed(() => {
    const az = this.sunPosition()?.azimuthDeg ?? 0;
    return { left: Math.sin(az * Math.PI / 180) * 42, top: -Math.cos(az * Math.PI / 180) * 42 };
  });
  readonly moonPosition = computed(() => this.moon()?.lunarPos ?? null);
  readonly moonDirection = computed(() => {
    const az = this.moonPosition()?.azimuthDeg ?? 0;
    return { left: Math.sin(az * Math.PI / 180) * 42, top: -Math.cos(az * Math.PI / 180) * 42 };
  });
  readonly pageCopy = computed(() => {
    const loc = this.location();
    const name = loc?.name ?? 'Place';
    if (this.kind() === 'sun') return { title: `Sunrise & Sunset in ${name} Today | 2PiClock`, heading: `Sunrise & sunset in ${name}`, intro: `Follow the Sun above ${name} with local sunrise, sunset, solar noon, daylight and the Sun's live position.` };
    if (this.kind() === 'moon') return { title: `Moon Phase & Moonrise in ${name} Today | 2PiClock`, heading: `Moon phase in ${name}`, intro: `See the Moon's phase, illumination, position and local sky geometry for ${name}.` };
    if (this.kind() === 'tonight') return { title: `Night Sky Tonight in ${name} | Moon, Twilight & Weather | 2PiClock`, heading: `What's happening in the sky tonight in ${name}?`, intro: `A visual snapshot of darkness, twilight, the Moon and atmospheric conditions over ${name}.` };
    return { title: `Current Time in ${name} — Sunrise, Sunset & Moon | 2PiClock`, heading: `Current time in ${name}`, intro: `Live local time for ${name}, with sunrise, sunset, Moon phase, daylight and the sky calculated for this location.` };
  });

  constructor() {
    effect(() => {
      const loc = this.location();
      if (!loc) return;
      this.locationService.selectLocation(loc);
      this.weatherService.fetchWeatherForLocation(loc);
      this.updateSeo(loc);
    });
  }

  formatTime(date: Date | null | undefined): string {
    const loc = this.location();
    return !date || !loc ? '--:--' : date.toLocaleTimeString('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDegrees(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(1) + '°';
  }

  private updateSeo(loc: GeoLocation): void {
    const copy = this.pageCopy();
    const canonicalUrl = `https://2piclock.com/${this.kind()}/${loc.id}`;
    const description = copy.intro;
    this.title.setTitle(copy.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: copy.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: copy.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    const canonical = this.document.querySelector('link[rel="canonical"]') ?? this.document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', canonicalUrl);
    if (!canonical.parentNode) this.document.head.appendChild(canonical);

    this.document.getElementById('seo-place-jsonld')?.remove();
    const script = this.document.createElement('script');
    script.id = 'seo-place-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: copy.title,
      description,
      url: canonicalUrl,
      about: { '@type': 'City', name: loc.name, containedInPlace: { '@type': 'Country', name: loc.country } },
      isPartOf: { '@type': 'WebApplication', name: '2PiClock', url: 'https://2piclock.com/' }
    });
    this.document.head.appendChild(script);
  }
}
