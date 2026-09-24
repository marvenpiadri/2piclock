import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type WeatherIconSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <i
      [class]="iconClass()"
      [attr.aria-label]="label()"
      [style.font-size]="sizeMap[size()]"
      [style.color]="color()"
      aria-hidden="true"></i>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
    .wi { display: inline-block; line-height: 1; }
  `]
})
export class WeatherIconComponent {
  readonly condition = input<string>('clear');
  readonly icon = input<string | undefined>();
  readonly label = input<string>('Weather');
  readonly size = input<WeatherIconSize>('md');
  readonly color = input<string>();

  readonly sizeMap: Record<WeatherIconSize, string> = { sm: '1rem', md: '1.45rem', lg: '2.6rem' };

  iconClass(): string {
    return 'wi ' + (this.icon() || this.mapCondition(this.condition()));
  }

  private mapCondition(condition: string): string {
    const c = (condition || '').toLowerCase();
    if (c.includes('severe') || c.includes('thunder')) return 'wi-day-storm-showers';
    if (c.includes('storm')) return 'wi-thunderstorm';
    if (c.includes('heavy_rain') || c.includes('downpour')) return 'wi-rain-wind';
    if (c.includes('rain')) return 'wi-rain';
    if (c.includes('drizzle')) return 'wi-sprinkle';
    if (c.includes('blizzard')) return 'wi-snow-wind';
    if (c.includes('heavy_snow')) return 'wi-snow';
    if (c.includes('snow')) return 'wi-snow';
    if (c.includes('fog')) return 'wi-fog';
    if (c.includes('haze')) return 'wi-day-haze';
    if (c.includes('overcast')) return 'wi-cloudy';
    if (c.includes('cloud')) return 'wi-cloudy';
    if (c.includes('partly')) return 'wi-day-cloudy';
    if (c.includes('clear') || c.includes('sunny')) return 'wi-day-sunny';
    return 'wi-day-cloudy';
  }
}
