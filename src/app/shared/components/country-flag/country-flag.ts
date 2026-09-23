import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-country-flag',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isSpecial()) {
      <span class="special-flag-badge inline-flex items-center justify-center font-mono select-none" [class]="customClass()">
        @if (countryCode() === 'GPS' || countryCode() === '📍') {
          📍
        } @else {
          🌐
        }
      </span>
    } @else if (hasError() || !cleanCode()) {
      <span class="fallback-flag-badge inline-flex items-center justify-center select-none" [class]="customClass()">
        🏳️
      </span>
    } @else {
      <img
        [src]="flagUrl()"
        [srcset]="flagUrl2x() + ' 2x'"
        [alt]="cleanCode()"
        referrerpolicy="no-referrer"
        loading="lazy"
        (error)="onImgError()"
        class="flag-img inline-block object-cover select-none shrink-0 shadow-xs"
        [class]="customClass() || 'w-5 h-3.5 rounded-[3px] border border-white/10'"
      />
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
    }
    .flag-img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    .special-flag-badge,
    .fallback-flag-badge {
      font-size: 0.9em;
      line-height: 1;
    }
  `]
})
export class CountryFlagComponent {
  readonly countryCode = input<string>('');
  readonly customClass = input<string>('');
  readonly hasError = signal<boolean>(false);

  readonly cleanCode = computed(() => {
    const raw = (this.countryCode() || '').trim().toLowerCase();
    if (raw.length === 2 && /^[a-z]{2}$/.test(raw)) {
      return raw;
    }
    return '';
  });

  readonly isSpecial = computed(() => {
    const raw = (this.countryCode() || '').trim().toUpperCase();
    return raw === 'GPS' || raw === '📍' || raw === '🌐' || raw === 'COORDINATES';
  });

  readonly flagUrl = computed(() => {
    const code = this.cleanCode();
    return code ? `https://flagcdn.com/w40/${code}.png` : '';
  });

  readonly flagUrl2x = computed(() => {
    const code = this.cleanCode();
    return code ? `https://flagcdn.com/w80/${code}.png` : '';
  });

  onImgError(): void {
    this.hasError.set(true);
  }
}
