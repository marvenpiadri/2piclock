import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WeatherService } from '../../../core/services/weather.service';
import { CelestialService } from '../../../core/services/celestial.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-200 animate-fade-in select-none"
      (click)="closeModal()">
      
      <!-- Modal Content Box -->
      <div 
        class="bg-neutral-950/95 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full text-white relative overflow-hidden flex flex-col max-h-[85vh]"
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <mat-icon class="text-lg">settings</mat-icon>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-extrabold uppercase font-mono tracking-wider text-white">
                Observatory Settings
              </h3>
              <p class="text-[10px] text-neutral-400 font-mono">
                Unified Display & Physics Toggles
              </p>
            </div>
          </div>

          <button 
            type="button" 
            (click)="closeModal()"
            class="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Stacked Settings Items -->
        <div class="my-4 space-y-3 overflow-y-auto pr-1">
          
          <!-- Item 1: Temperature Unit -->
          <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">thermostat</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold text-white">Temperature Scale</div>
                <div class="text-[10px] text-neutral-400">Choose between Celsius or Fahrenheit</div>
              </div>
            </div>

            <button 
              type="button"
              (click)="toggleTemperatureUnit()"
              class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all cursor-pointer">
              {{ isFahrenheit() ? 'Fahrenheit (°F)' : 'Celsius (°C)' }}
            </button>
          </div>

          <!-- Item 2: Weather Particle Physics Overlay -->
          <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">grain</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold text-white">Weather Particles</div>
                <div class="text-[10px] text-neutral-400">Atmospheric rain, snow & fog overlay</div>
              </div>
            </div>

            <button 
              type="button"
              (click)="toggleParticles()"
              class="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer"
              [class.bg-emerald-500/20]="showParticles()"
              [class.text-emerald-300]="showParticles()"
              [class.border-emerald-500/40]="showParticles()"
              [class.bg-neutral-800]="!showParticles()"
              [class.text-neutral-400]="!showParticles()"
              [class.border-white/10]="!showParticles()">
              {{ showParticles() ? 'ENABLED' : 'DISABLED' }}
            </button>
          </div>

          <!-- Item 3: Map Wind Vector Streamlines -->
          <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">air</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold text-white">Wind Vectors</div>
                <div class="text-[10px] text-neutral-400">Windy.com style streamline flow</div>
              </div>
            </div>

            <button 
              type="button"
              (click)="toggleWindVectors()"
              class="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer"
              [class.bg-emerald-500/20]="showWindVectors()"
              [class.text-emerald-300]="showWindVectors()"
              [class.border-emerald-500/40]="showWindVectors()"
              [class.bg-neutral-800]="!showWindVectors()"
              [class.text-neutral-400]="!showWindVectors()"
              [class.border-white/10]="!showWindVectors()">
              {{ showWindVectors() ? 'ENABLED' : 'DISABLED' }}
            </button>
          </div>

          <!-- Item 4: Glass Material -->
          <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">blur_on</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold text-white">Glass Material</div>
                <div class="text-[10px] text-neutral-400">Use translucent surfaces over the live atmosphere</div>
              </div>
            </div>
            <button type="button" (click)="toggleGlassMode()" class="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer"
              [class.bg-emerald-500/20]="isGlassEnabled()" [class.text-emerald-300]="isGlassEnabled()" [class.border-emerald-500/40]="isGlassEnabled()"
              [class.bg-neutral-800]="!isGlassEnabled()" [class.text-neutral-400]="!isGlassEnabled()" [class.border-white/10]="!isGlassEnabled()">
              {{ isGlassEnabled() ? 'ENABLED' : 'DISABLED' }}
            </button>
          </div>

          <!-- Item 4: Primary Clock Style -->
          <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-base">schedule</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold text-white">Clock Interface</div>
                <div class="text-[10px] text-neutral-400">Analog vs 2π Radian Polar Dial</div>
              </div>
            </div>

            <button 
              type="button"
              (click)="toggleClockMode()"
              class="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition-all cursor-pointer">
              {{ clockDisplayMode() === 'analog' ? 'Analog' : '2π Radian' }}
            </button>
          </div>

        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <span class="text-[10px] font-mono text-neutral-400">2PiClock Settings Engine v2.4</span>
          <button 
            type="button" 
            (click)="closeModal()"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer">
            Done
          </button>
        </div>

      </div>
    </div>
  `
})
export class SettingsModalComponent {
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() glassModeChange = new EventEmitter<boolean>();

  private weatherService = inject(WeatherService);
  private celestialService = inject(CelestialService);

  readonly isFahrenheit = this.weatherService.isFahrenheit;
  readonly showParticles = signal<boolean>(true);
  readonly showWindVectors = signal<boolean>(true);
  readonly clockDisplayMode = signal<'analog' | 'radian'>('analog');
  readonly isGlassEnabled = signal<boolean>(true);

  toggleTemperatureUnit(): void {
    this.weatherService.toggleFahrenheit();
  }

  toggleParticles(): void {
    this.showParticles.update(v => !v);
  }

  toggleWindVectors(): void {
    this.showWindVectors.update(v => !v);
  }

  toggleClockMode(): void {
    this.clockDisplayMode.update(m => m === 'analog' ? 'radian' : 'analog');
  }

  toggleGlassMode(): void {
    this.isGlassEnabled.update(v => !v);
    this.glassModeChange.emit(this.isGlassEnabled());
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }
}
