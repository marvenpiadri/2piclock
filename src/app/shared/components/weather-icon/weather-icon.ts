import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type WeatherIconSize = 'sm' | 'md' | 'lg';
const CDN = 'https://cdn.meteocons.com/latest/svg/fill';

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img [src]="iconUrl()" [alt]="label()" [width]="pixelSize[size()]" [height]="pixelSize[size()]"
      loading="lazy" decoding="async" class="meteocons-weather-icon" />
  `,
  styles: [`
    :host { display:inline-flex; align-items:center; justify-content:center; line-height:1; flex:0 0 auto; }
    .meteocons-weather-icon { display:block; width:auto; height:auto; object-fit:contain; }
  `]
})
export class WeatherIconComponent {
  readonly condition = input<string>('clear');
  readonly icon = input<string | undefined>();
  readonly label = input<string>('Weather');
  readonly size = input<WeatherIconSize>('md');
  readonly pixelSize: Record<WeatherIconSize, number> = { sm: 24, md: 40, lg: 72 };

  iconUrl(): string {
    const slug = this.normalizeSlug(this.icon() || this.mapCondition(this.condition()));
    return `${CDN}/${slug}.svg`;
  }

  private normalizeSlug(value: string): string {
    const raw = value.toLowerCase().trim().replace(/^wi-/, '').replace(/_/g, '-');
    const aliases: Record<string,string> = {
      'wb-sunny':'clear-day','dark-mode':'clear-night','partly-cloudy-day':'partly-cloudy-day','partly-cloudy-night':'partly-cloudy-night','cloud':'cloudy','cloudy':'cloudy','cloud-queue':'overcast',
      'rainy':'rain','grain':'drizzle','drizzle':'drizzle','thunderstorm':'thunderstorms-day-rain','thunderstorms-day-rain':'thunderstorms-day-rain','foggy':'fog',
      'weather-snowy':'snow','ac-unit':'snow','air':'wind','strong-wind':'wind','bolt':'thunderstorms-day',
      'blur-on':'fog','visibility':'visibility','speed':'barometer','water-drop':'humidity',
      'opacity':'humidity','wb-twilight':'sunrise','sunny':'clear-day'
    };
    return aliases[raw] || raw;
  }

  private mapCondition(condition: string): string {
    const c = (condition || '').toLowerCase();
    if (c.includes('severe') && c.includes('thunder')) return 'thunderstorms-day-extreme-rain';
    if (c.includes('thunder')) return 'thunderstorms-day-rain';
    if (c.includes('blizzard')) return 'extreme-snow';
    if (c.includes('heavy_snow') || c.includes('heavy snow')) return 'extreme-snow';
    if (c.includes('snow')) return 'snow';
    if (c.includes('heavy_rain') || c.includes('downpour')) return 'extreme-rain';
    if (c.includes('drizzle')) return 'drizzle';
    if (c.includes('rain')) return 'rain';
    if (c.includes('freezing')) return 'sleet';
    if (c.includes('fog') || c.includes('mist')) return 'fog';
    if (c.includes('haze')) return 'haze';
    if (c.includes('overcast')) return 'overcast';
    if (c.includes('cloud')) return 'cloudy';
    if (c.includes('partly')) return 'partly-cloudy-day';
    if (c.includes('clear') || c.includes('sunny')) return 'clear-day';
    return 'not-available';
  }
}
