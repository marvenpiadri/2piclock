import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SimulationSpeed = 1 | 10 | 60 | 300 | 1200;

/**
 * The temporal authority for 2PiClock.
 *
 * Live mode is anchored to an epoch timestamp once, then advanced with
 * performance.now() so a wall-clock adjustment does not make the visible
 * clock jump every animation frame. The wall clock is periodically sampled
 * to correct long-term drift.
 */
@Injectable({ providedIn: 'root' })
export class TimeControlService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly baseDate = signal<Date>(new Date());
  readonly isLive = signal(true);
  readonly isPlaying = signal(true);
  readonly simulationSpeed = signal<SimulationSpeed>(1);

  readonly simulatedTimeOfDayMs = signal(this.getInitialTimeOfDayMs());
  private readonly liveEpochMs = signal(Date.now());

  readonly currentActiveDate = computed(() => {
    if (this.isLive()) {
      return new Date(this.liveEpochMs());
    }

    const base = this.baseDate();
    const midnight = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      0, 0, 0, 0
    );

    return new Date(midnight.getTime() + this.simulatedTimeOfDayMs());
  });

  readonly dayFraction = computed(() => {
    const d = this.currentActiveDate();
    return (
      (d.getHours() * 3600000 +
        d.getMinutes() * 60000 +
        d.getSeconds() * 1000 +
        d.getMilliseconds()) /
      86400000
    );
  });

  private animationFrameId: number | null = null;
  private lastPerformanceTime = 0;
  private liveAnchorEpochMs = Date.now();
  private liveAnchorPerformanceMs = 0;
  private lastClockResyncPerformanceMs = 0;

  constructor() {
    if (this.isBrowser) {
      this.liveAnchorPerformanceMs = performance.now();
      this.lastClockResyncPerformanceMs = this.liveAnchorPerformanceMs;
      this.startLoop();
    }
  }

  private getInitialTimeOfDayMs(): number {
    const now = new Date();
    return (
      now.getHours() * 3600000 +
      now.getMinutes() * 60000 +
      now.getSeconds() * 1000 +
      now.getMilliseconds()
    );
  }

  private startLoop(): void {
    this.lastPerformanceTime = performance.now();

    const tick = (performanceTime: number) => {
      const deltaMs = Math.min(
        Math.max(0, performanceTime - this.lastPerformanceTime),
        250
      );
      this.lastPerformanceTime = performanceTime;

      if (this.isLive()) {
        const elapsed = performanceTime - this.liveAnchorPerformanceMs;
        const epoch = this.liveAnchorEpochMs + elapsed;
        this.liveEpochMs.set(epoch);

        // Re-anchor every 30 seconds to absorb system clock corrections
        // without introducing visible per-frame jitter.
        if (performanceTime - this.lastClockResyncPerformanceMs >= 30000) {
          this.reanchorLiveClock(performanceTime);
        }
      } else if (this.isPlaying()) {
        const advancement = deltaMs * this.simulationSpeed();
        this.advanceSimulation(advancement);
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private reanchorLiveClock(performanceTime: number): void {
    this.liveAnchorEpochMs = Date.now();
    this.liveAnchorPerformanceMs = performanceTime;
    this.lastClockResyncPerformanceMs = performanceTime;
    this.liveEpochMs.set(this.liveAnchorEpochMs);
  }

  private advanceSimulation(advancementMs: number): void {
    let next = this.simulatedTimeOfDayMs() + advancementMs;
    let dayCarry = 0;

    while (next >= 86400000) {
      next -= 86400000;
      dayCarry++;
    }

    while (next < 0) {
      next += 86400000;
      dayCarry--;
    }

    if (dayCarry !== 0) {
      this.baseDate.update(date => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + dayCarry);
        return nextDate;
      });
    }

    this.simulatedTimeOfDayMs.set(next);
  }

  setLive(): void {
    const now = Date.now();
    const perf = this.isBrowser ? performance.now() : 0;

    this.liveAnchorEpochMs = now;
    this.liveAnchorPerformanceMs = perf;
    this.lastClockResyncPerformanceMs = perf;
    this.liveEpochMs.set(now);

    const date = new Date(now);
    this.baseDate.set(date);
    this.isLive.set(true);
    this.isPlaying.set(true);
    this.simulationSpeed.set(1);
    this.simulatedTimeOfDayMs.set(this.getInitialTimeOfDayMs());
  }

  setTimeOfDayFraction(fraction: number): void {
    this.isLive.set(false);
    this.simulatedTimeOfDayMs.set(
      Math.max(0, Math.min(0.999999999, fraction)) * 86400000
    );
  }

  setTimeHoursMinutes(hours: number, minutes: number, seconds = 0): void {
    this.isLive.set(false);
    const safeHours = Math.max(0, Math.min(23, hours));
    const safeMinutes = Math.max(0, Math.min(59, minutes));
    const safeSeconds = Math.max(0, Math.min(59, seconds));
    this.simulatedTimeOfDayMs.set(
      (safeHours * 3600 + safeMinutes * 60 + safeSeconds) * 1000
    );
  }

  setSpecificDate(year: number, month: number, day: number): void {
    this.baseDate.set(new Date(year, month - 1, day, 0, 0, 0, 0));
    this.isLive.set(false);
  }

  setSimulationSpeed(speed: SimulationSpeed): void {
    this.simulationSpeed.set(speed);
    this.isLive.set(false);
  }

  togglePlayPause(): void {
    if (this.isLive()) {
      this.isLive.set(false);
      this.isPlaying.set(false);
      return;
    }

    this.isPlaying.update(value => !value);
  }

  stepMinutes(minutes: number): void {
    this.isLive.set(false);
    this.advanceSimulation(minutes * 60000);
  }
}
