import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analog-clock',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full aspect-square max-w-[200px] mx-auto rounded-full bg-slate-950 border-2 border-emerald-500/40 shadow-xl flex items-center justify-center p-2">
      <svg class="w-full h-full overflow-visible" viewBox="0 0 200 200">
        <!-- Outer Ring Glow -->
        <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(16, 185, 129, 0.2)" stroke-width="2" />
        
        <!-- Dial Tick Marks -->
        @for (tick of minuteTicks; track tick.angle) {
          <line
            [attr.x1]="tick.x1"
            [attr.y1]="tick.y1"
            [attr.x2]="tick.x2"
            [attr.y2]="tick.y2"
            [attr.stroke]="tick.isMajor ? 'rgba(255,255,255,0.6)' : 'rgba(148, 163, 184, 0.3)'"
            [attr.stroke-width]="tick.isMajor ? '2' : '1'"
          />
        }

        <!-- Clock Numbers 12, 3, 6, 9 -->
        <text x="100" y="32" fill="#cbd5e1" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">12</text>
        <text x="170" y="106" fill="#cbd5e1" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">3</text>
        <text x="100" y="180" fill="#cbd5e1" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">6</text>
        <text x="30" y="106" fill="#cbd5e1" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">9</text>

        <!-- Hour Hand -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="hourHandCoords().x"
          [attr.y2]="hourHandCoords().y"
          stroke="#ffffff"
          stroke-width="5"
          stroke-linecap="round"
        />

        <!-- Minute Hand -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="minuteHandCoords().x"
          [attr.y2]="minuteHandCoords().y"
          stroke="#e2e8f0"
          stroke-width="3"
          stroke-linecap="round"
        />

        <!-- Second Hand -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="secondHandCoords().x"
          [attr.y2]="secondHandCoords().y"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Second hand tail -->
        <line
          [attr.x1]="100"
          [attr.y1]="100"
          [attr.x2]="secondTailCoords().x"
          [attr.y2]="secondTailCoords().y"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-linecap="round"
        />

        <!-- Center Pin -->
        <circle cx="100" cy="100" r="4.5" fill="#ffffff" />
        <circle cx="100" cy="100" r="2" fill="#ef4444" />
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
  @Input({ required: true }) timezone: string = 'UTC';
  @Input() activeDate: Date = new Date();

  readonly minuteTicks = (() => {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      const rOuter = 88;
      const rInner = isMajor ? 78 : 83;
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
    const length = 52;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly minuteHandCoords = computed(() => {
    const t = this.parsedTime();
    const totalMinutes = t.minutes + t.seconds / 60;
    const angle = (totalMinutes / 60) * Math.PI * 2;
    const length = 70;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly secondHandCoords = computed(() => {
    const t = this.parsedTime();
    const angle = (t.seconds / 60) * Math.PI * 2;
    const length = 76;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });

  readonly secondTailCoords = computed(() => {
    const t = this.parsedTime();
    const angle = (t.seconds / 60) * Math.PI * 2;
    const length = -18;
    return {
      x: 100 + Math.sin(angle) * length,
      y: 100 - Math.cos(angle) * length
    };
  });
}
