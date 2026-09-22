import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SimulationSpeed = 1 | 10 | 60 | 300 | 1200;

@Injectable({
  providedIn: 'root'
})
export class TimeControlService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Base simulation date (year, month, day)
  readonly baseDate = signal<Date>(new Date());
  
  // Simulated time offset in milliseconds from baseDate's midnight
  // When isLive is true, this continually mirrors real time
  readonly isLive = signal<boolean>(true);
  readonly isPlaying = signal<boolean>(true);
  readonly simulationSpeed = signal<SimulationSpeed>(1);

  // Time in ms from midnight [0, 86400000)
  readonly simulatedTimeOfDayMs = signal<number>(this.getInitialTimeOfDayMs());

  // Current active date-time computed signal
  readonly currentActiveDate = computed<Date>(() => {
    const base = this.baseDate();
    const ms = this.simulatedTimeOfDayMs();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    return new Date(d.getTime() + ms);
  });

  // Time progress normalized from 0.0 to 1.0
  readonly dayFraction = computed<number>(() => {
    return this.simulatedTimeOfDayMs() / 86400000;
  });

  private animFrameId: number | null = null;
  private lastTickTimestamp = 0;

  constructor() {
    if (this.isBrowser) {
      this.startLoop();
    }
  }

  private getInitialTimeOfDayMs(): number {
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
  }

  private startLoop(): void {
    this.lastTickTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaMs = now - this.lastTickTimestamp;
      this.lastTickTimestamp = now;

      if (this.isLive()) {
        const realNow = new Date();
        const ms = (realNow.getHours() * 3600 + realNow.getMinutes() * 60 + realNow.getSeconds()) * 1000 + realNow.getMilliseconds();
        this.simulatedTimeOfDayMs.set(ms);
        this.baseDate.set(realNow);
      } else if (this.isPlaying()) {
        const speed = this.simulationSpeed();
        const advancement = deltaMs * speed;
        this.simulatedTimeOfDayMs.update(current => {
          let next = current + advancement;
          if (next >= 86400000) {
            next = next % 86400000;
            // Advance day
            this.baseDate.update(d => new Date(d.getTime() + 86400000));
          }
          return next;
        });
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  setLive(): void {
    this.isLive.set(true);
    this.simulationSpeed.set(1);
    this.isPlaying.set(true);
    const now = new Date();
    this.baseDate.set(now);
    const ms = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
    this.simulatedTimeOfDayMs.set(ms);
  }

  setTimeOfDayFraction(fraction: number): void {
    this.isLive.set(false);
    const clamped = Math.max(0, Math.min(0.999999, fraction));
    this.simulatedTimeOfDayMs.set(clamped * 86400000);
  }

  setTimeHoursMinutes(hours: number, minutes: number, seconds = 0): void {
    this.isLive.set(false);
    const ms = (hours * 3600 + minutes * 60 + seconds) * 1000;
    this.simulatedTimeOfDayMs.set(ms);
  }

  setSpecificDate(year: number, month: number, day: number): void {
    this.baseDate.set(new Date(year, month - 1, day, 0, 0, 0));
    this.isLive.set(false);
  }

  setSimulationSpeed(speed: SimulationSpeed): void {
    this.simulationSpeed.set(speed);
    if (this.isLive()) {
      this.isLive.set(false);
    }
  }

  togglePlayPause(): void {
    if (this.isLive()) {
      this.isLive.set(false);
      this.isPlaying.set(false);
    } else {
      this.isPlaying.update(p => !p);
    }
  }

  stepMinutes(minutes: number): void {
    this.isLive.set(false);
    this.simulatedTimeOfDayMs.update(current => {
      let next = current + minutes * 60000;
      if (next < 0) next = 86400000 + (next % 86400000);
      if (next >= 86400000) next = next % 86400000;
      return next;
    });
  }
}
