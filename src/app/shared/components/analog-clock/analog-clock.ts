import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { calculateSolarEvents } from '../../../core/astronomy/astronomy-engine';

@Component({
  selector: 'app-analog-clock',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full aspect-square max-w-[200px] mx-auto rounded-full bg-slate-950 border border-amber-500/30 shadow-xl flex items-center justify-center p-2">
      <svg class="w-full h-full overflow-visible" viewBox="0 0 200 200">
        <!-- Main Clock Face Background -->
        <circle cx="100" cy="100" r="90" fill="#090d16" stroke="rgba(245, 158, 11, 0.25)" stroke-width="1.5" />

        <!-- Minimal Arc-Based Twilight & Lighting Phase Overlays (Radius ~72) -->
        @if (blueHourMorningArc; as path) {
          <path [attr.d]="path" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" opacity="0.75" />
        }
        @if (goldenHourMorningArc; as path) {
          <path [attr.d]="path" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round" opacity="0.85" />
        }
        @if (daytimeArc; as path) {
          <path [attr.d]="path" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" opacity="0.5" />
        }
        @if (goldenHourEveningArc; as path) {
          <path [attr.d]="path" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round" opacity="0.85" />
        }
        @if (blueHourEveningArc; as path) {
          <path [attr.d]="path" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" opacity="0.75" />
        }
        
        <!-- Dial Tick Marks (Amber tinted) -->
        @for (tick of minuteTicks; track tick.angle) {
          <line
            [attr.x1]="tick.x1"
            [attr.y1]="tick.y1"
            [attr.x2]="tick.x2"
            [attr.y2]="tick.y2"
            [attr.stroke]="tick.isMajor ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.3)'"
            [attr.stroke-width]="tick.isMajor ? '1.5' : '0.75'"
          />
        }

        <!-- Minimalist Amber Numbers with Increased Whitespace (Radius ~56) -->
        <text x="100" y="34" fill="#f59e0b" font-size="12" font-family="monospace" font-weight="600" text-anchor="middle" dominant-baseline="central">12</text>
        <text x="166" y="100" fill="#f59e0b" font-size="12" font-family="monospace" font-weight="600" text-anchor="middle" dominant-baseline="central">3</text>
        <text x="100" y="166" fill="#f59e0b" font-size="12" font-family="monospace" font-weight="600" text-anchor="middle" dominant-baseline="central">6</text>
        <text x="34" y="100" fill="#f59e0b" font-size="12" font-family="monospace" font-weight="600" text-anchor="middle" dominant-baseline="central">9</text>

        <!-- Hour Hand (Amber/Gold) -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="hourHandCoords().x"
          [attr.y2]="hourHandCoords().y"
          stroke="#f59e0b"
          stroke-width="3.5"
          stroke-linecap="round"
        />

        <!-- Minute Hand (Amber/Gold) -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="minuteHandCoords().x"
          [attr.y2]="minuteHandCoords().y"
          stroke="#fcd34d"
          stroke-width="2"
          stroke-linecap="round"
        />

        <!-- Second Hand -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="secondHandCoords().x"
          [attr.y2]="secondHandCoords().y"
          stroke="#ef4444"
          stroke-width="1"
          stroke-linecap="round"
        />
        <!-- Second hand tail -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="secondTailCoords().x"
          [attr.y2]="secondTailCoords().y"
          stroke="#ef4444"
          stroke-width="1"
          stroke-linecap="round"
        />

        <!-- Center Pin -->
        <circle cx="100" cy="100" r="3" fill="#f59e0b" />
        <circle cx="100" cy="100" r="1.2" fill="#090d16" />
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AnalogClockComponent {
  @Input({ required: true }) timezone = 'UTC';
  @Input() activeDate: Date = new Date();
  @Input() latitude = 0;
  @Input() longitude = 0;

  readonly solarEvents = computed(() => {
    return calculateSolarEvents(this.activeDate, this.latitude, this.longitude);
  });

  getArcPath(start: Date | null, end: Date | null, radius: number): string {
    if (!start || !end) return '';
    const getFraction = (d: Date) => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: this.timezone,
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: false
        });
        const parts = formatter.formatToParts(d);
        let h = 0, m = 0, s = 0;
        for (const p of parts) {
          if (p.type === 'hour') h = parseInt(p.value, 10);
          if (p.type === 'minute') m = parseInt(p.value, 10);
          if (p.type === 'second') s = parseInt(p.value, 10);
        }
        return ((h % 12) + m / 60 + s / 3600) / 12;
      } catch {
        const h = d.getHours();
        const m = d.getMinutes();
        const s = d.getSeconds();
        return ((h % 12) + m / 60 + s / 3600) / 12;
      }
    };

    const f1 = getFraction(start);
    const f2 = getFraction(end);
    let diff = f2 - f1;
    if (diff <= 0) diff += 1;

    const angle1 = f1 * Math.PI * 2;
    const angle2 = (f1 + diff) * Math.PI * 2;

    const x1 = 100 + Math.sin(angle1) * radius;
    const y1 = 100 - Math.cos(angle1) * radius;
    const x2 = 100 + Math.sin(angle2) * radius;
    const y2 = 100 - Math.cos(angle2) * radius;

    const largeArcFlag = diff > 0.5 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  }

  get blueHourMorningArc(): string {
    const ev = this.solarEvents().blueHourMorning;
    return this.getArcPath(ev?.start || null, ev?.end || null, 72);
  }
  get goldenHourMorningArc(): string {
    const ev = this.solarEvents().goldenHourMorning;
    return this.getArcPath(ev?.start || null, ev?.end || null, 72);
  }
  get daytimeArc(): string {
    const ev = this.solarEvents();
    return this.getArcPath(ev.sunrise, ev.sunset, 72);
  }
  get goldenHourEveningArc(): string {
    const ev = this.solarEvents().goldenHourEvening;
    return this.getArcPath(ev?.start || null, ev?.end || null, 72);
  }
  get blueHourEveningArc(): string {
    const ev = this.solarEvents().blueHourEvening;
    return this.getArcPath(ev?.start || null, ev?.end || null, 72);
  }

  readonly minuteTicks = (() => {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      const rOuter = 88;
      const rInner = isMajor ? 80 : 84;
      ticks.push({
        angle: i,
        isMajor,
        x1: 100 + Math.sin(angle) * rOuter,
        y1: 100 - Math.cos(angle) * rOuter,
        x2: 100 + Math.sin(angle) * rInner,
        y2: 100 - Math.cos(angle) * rInner
      });
    }
    return ticks;
  })();

  private parsedTime = computed(() => {
    const d = this.activeDate;
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: this.timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(d);
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      for (const p of parts) {
        if (p.type === 'hour') hours = parseInt(p.value, 10);
        if (p.type === 'minute') minutes = parseInt(p.value, 10);
        if (p.type === 'second') seconds = parseInt(p.value, 10);
      }
      return { hours: hours % 12, minutes, seconds, rawHours: hours };
    } catch {
      return { hours: d.getHours() % 12, minutes: d.getMinutes(), seconds: d.getSeconds(), rawHours: d.getHours() };
    }
  });

  readonly hourHandCoords = computed(() => {
    const t = this.parsedTime();
    const totalHours = t.hours + t.minutes / 60 + t.seconds / 3600;
    const angle = (totalHours / 12) * Math.PI * 2;
    const length = 42;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly minuteHandCoords = computed(() => {
    const t = this.parsedTime();
    const totalMinutes = t.minutes + t.seconds / 60;
    const angle = (totalMinutes / 60) * Math.PI * 2;
    const length = 60;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly secondHandCoords = computed(() => {
    const t = this.parsedTime();
    const angle = (t.seconds / 60) * Math.PI * 2;
    const length = 68;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly secondTailCoords = computed(() => {
    const t = this.parsedTime();
    const angle = (t.seconds / 60) * Math.PI * 2;
    const length = -12;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });
}
