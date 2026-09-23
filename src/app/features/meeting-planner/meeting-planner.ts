import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LocationService } from '../../core/services/location.service';
import { TimeControlService } from '../../core/services/time-control.service';
import { GeoLocation } from '../../core/models/location.model';
import { RadianOverlapTunnelComponent } from '../../shared/components/radian-overlap-tunnel/radian-overlap-tunnel';
import { CountryFlagPipe } from '../../core/pipes/country-flag.pipe';
import { calculateRadianTimeOverlap, calculateSolarPosition } from '../../core/astronomy/astronomy-engine';

interface CityPlannerSlot {
  location: GeoLocation;
  localTime: string;
  localDate: string;
  isDifferentDate: boolean;
  sunElevationDeg: number;
  isDay: boolean;
  statusType: 'work' | 'extended' | 'sleep' | 'personal';
  statusLabel: string;
}

@Component({
  selector: 'app-meeting-planner',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RadianOverlapTunnelComponent,
    CountryFlagPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-planner.html',
  styleUrl: './meeting-planner.css'
})
export class MeetingPlannerComponent {
  private locationService = inject(LocationService);
  private timeControlService = inject(TimeControlService);

  readonly allPresets = this.locationService.allPresets;
  readonly baseActiveDate = this.timeControlService.currentActiveDate;

  // Selected cities for multi-meridian coordination (default to 4 diverse major hubs)
  readonly selectedCities = signal<GeoLocation[]>([
    this.allPresets.find(p => p.id === 'san-francisco') || this.allPresets[0],
    this.allPresets.find(p => p.id === 'new-york') || this.allPresets[1],
    this.allPresets.find(p => p.id === 'london') || this.allPresets[2],
    this.allPresets.find(p => p.id === 'tokyo') || this.allPresets[3]
  ]);

  // Selected UTC hour offset on the 24h scrubber (0 to 24)
  readonly scrubbedUtcHour = signal<number>(14); // default 14:00 UTC (9am SF, 12pm NY, 5pm London, 11pm Tokyo)
  readonly copyNotification = signal<string | null>(null);

  // Synchronized instantaneous Date derived from baseActiveDate + scrubbedUtcHour
  readonly synchronizedDate = computed<Date>(() => {
    const base = this.baseActiveDate();
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0));
    d.setUTCHours(Math.floor(this.scrubbedUtcHour()));
    d.setUTCMinutes(Math.round((this.scrubbedUtcHour() % 1) * 60));
    return d;
  });

  // Calculate overlap analysis for selected cities
  readonly overlapMatrix = computed(() => {
    const cities = this.selectedCities().map(c => ({
      id: c.id,
      name: c.name,
      flag: c.flag || '🌐',
      timezone: c.timezone
    }));
    return calculateRadianTimeOverlap(cities, this.synchronizedDate());
  });

  // Real-time synchronization slots for each selected city
  readonly citySlots = computed<CityPlannerSlot[]>(() => {
    const syncInstant = this.synchronizedDate();
    const utcDateStr = syncInstant.toISOString().slice(0, 10);

    return this.selectedCities().map(loc => {
      let localTime = '--:--';
      let localDate = '';
      let isDifferentDate = false;
      let localHour = 0;

      try {
        localTime = syncInstant.toLocaleTimeString('en-US', {
          timeZone: loc.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const [h, m] = localTime.split(':').map(Number);
        localHour = h + (m || 0) / 60;

        localDate = syncInstant.toLocaleDateString('en-US', {
          timeZone: loc.timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        // Check if date differs from UTC day
        const locDateIso = new Intl.DateTimeFormat('en-CA', {
          timeZone: loc.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(syncInstant);
        isDifferentDate = locDateIso !== utcDateStr;
      } catch {
        localTime = syncInstant.toTimeString().slice(0, 5);
      }

      // Solar position at this coordinate and moment
      const sun = calculateSolarPosition(syncInstant, loc.latitude, loc.longitude);

      // Status classification
      let statusType: CityPlannerSlot['statusType'] = 'personal';
      let statusLabel = 'Off-Hours';

      if (localHour >= 9 && localHour < 17) {
        statusType = 'work';
        statusLabel = 'Core Work (9–17)';
      } else if ((localHour >= 8 && localHour < 9) || (localHour >= 17 && localHour < 19)) {
        statusType = 'extended';
        statusLabel = 'Extended/Flex';
      } else if (localHour >= 22 || localHour < 7) {
        statusType = 'sleep';
        statusLabel = 'Rest / Sleeping';
      } else {
        statusType = 'personal';
        statusLabel = 'Personal Time';
      }

      return {
        location: loc,
        localTime,
        localDate,
        isDifferentDate,
        sunElevationDeg: Math.round(sun.altitudeDeg * 10) / 10,
        isDay: sun.altitudeDeg > 0,
        statusType,
        statusLabel
      };
    });
  });

  // Available cities to add (not currently selected)
  readonly availableCities = computed(() => {
    const selectedIds = new Set(this.selectedCities().map(c => c.id));
    return this.allPresets.filter(c => !selectedIds.has(c.id));
  });

  setScrubbedHour(hour: number): void {
    this.scrubbedUtcHour.set(Math.max(0, Math.min(23.75, hour)));
  }

  onScrubberInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.setScrubbedHour(val);
  }

  addCity(loc: GeoLocation): void {
    if (this.selectedCities().length >= 6) return;
    this.selectedCities.update(current => [...current, loc]);
  }

  removeCity(id: string): void {
    if (this.selectedCities().length <= 2) return; // Keep at least 2 for overlap
    this.selectedCities.update(current => current.filter(c => c.id !== id));
  }

  formatUtcH(utcH: number): string {
    const h = Math.floor(utcH);
    const m = Math.round((utcH - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`;
  }

  copyScheduleSummary(): void {
    const best = this.overlapMatrix().bestWindow;
    const instant = this.synchronizedDate();
    let text = `🗓️ 2PiClock Universal Meeting Coordination\n`;
    text += `Target Instant: ${this.formatUtcH(this.scrubbedUtcHour())} (${instant.toDateString()})\n\n`;
    text += `PARTICIPANT LOCAL TIMES:\n`;

    this.citySlots().forEach(slot => {
      text += `• ${slot.location.flag || '🌐'} ${slot.location.name} (${slot.location.timezone}): ${slot.localTime} [${slot.statusLabel}]\n`;
    });

    if (best) {
      text += `\n✨ RECOMMENDED COMMON SWEET SPOT:\n`;
      text += `${this.formatUtcH(best.startUtcH)} - ${this.formatUtcH(best.endUtcH)} (${best.durationHours}h window)\n`;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.copyNotification.set('Schedule copied to clipboard!');
        setTimeout(() => this.copyNotification.set(null), 3000);
      });
    }
  }
}
