import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { calculateRadianTimeOverlap } from '../../../core/astronomy/astronomy-engine';
import { LocationService } from '../../../core/services/location.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-radian-overlap-tunnel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlap-container glass-panel">
      <div class="overlap-header flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
        <div>
          <h3 class="font-mono text-sm text-amber-400 tracking-wider uppercase flex items-center gap-2">
            <mat-icon class="text-amber-500 text-base">donut_large</mat-icon>
            Radian Time-Overlap Matrix (Meeting Sweet Spot)
          </h3>
          <p class="text-xs text-slate-400">Concentric 24-hour polar rings highlight universal working hour overlaps (09:00 - 17:00)</p>
        </div>
        @if (overlapData.bestWindow; as best) {
          <div class="best-badge bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-left md:text-right">
            <div class="text-[10px] uppercase font-mono text-amber-400">Optimal Meeting Window</div>
            <div class="text-xs font-mono font-bold text-white">{{ formatUtcH(best.startUtcH) }} - {{ formatUtcH(best.endUtcH) }} UTC ({{ best.durationHours }}h)</div>
          </div>
        }
      </div>

      <div class="canvas-wrapper relative w-full h-64 flex items-center justify-center bg-slate-950/80 rounded-xl border border-amber-500/20 overflow-hidden shadow-inner">
        <canvas #overlapCanvas class="w-full h-full block"></canvas>
      </div>

      <div class="overlap-legend grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        @let presets = locationService.allPresets.slice(0, 4);
        @for (city of presets; track city.id) {
          <div class="city-slot-legend bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-xs font-mono">
            <div class="flex items-center gap-1.5 font-bold text-amber-300">
              <span>{{ city.flag }}</span>
              <span>{{ city.name }}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-1">TZ: {{ city.timezone.split('/')[1] || city.timezone }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .overlap-container {
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 1rem;
    }
  `]
})
export class RadianOverlapTunnelComponent implements OnInit, OnDestroy {
  @ViewChild('overlapCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() activeDate: Date = new Date();

  private platformId = inject(PLATFORM_ID);
  readonly locationService = inject(LocationService);
  private animFrameId: number | null = null;

  overlapData: ReturnType<typeof calculateRadianTimeOverlap> = { slots24h: [], sweetSpotWindows: [], bestWindow: null };

  ngOnInit(): void {
    this.updateOverlap();
    if (isPlatformBrowser(this.platformId)) {
      this.startRender();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private updateOverlap(): void {
    const presets = this.locationService.allPresets.slice(0, 4);
    this.overlapData = calculateRadianTimeOverlap(presets, this.activeDate);
  }

  formatUtcH(utcH: number): string {
    const h = Math.floor(utcH);
    const m = Math.round((utcH - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private startRender(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      this.updateOverlap();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(cx, cy) - 25;

      const presets = this.locationService.allPresets.slice(0, 4);
      const ringWidth = (baseRadius - 35) / presets.length;

      // Draw 24-hour radial ticks
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.lineWidth = 1;
      for (let hour = 0; hour < 24; hour += 3) {
        const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const innerR = 30;
        const outerR = baseRadius;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelR = outerR + 12;
        ctx.fillText(`${hour}h`, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
      }

      // Draw Concentric Rings for each city
      presets.forEach((city: any, idx: number) => {
        const ringOuter = baseRadius - idx * ringWidth;
        const ringInner = ringOuter - ringWidth + 4;

        ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.lineWidth = ringWidth - 4;
        ctx.beginPath();
        ctx.arc(cx, cy, (ringOuter + ringInner) / 2, 0, Math.PI * 2);
        ctx.stroke();

        this.overlapData.slots24h.forEach(slot => {
          const startAngle = (slot.utcHour / 24) * Math.PI * 2 - Math.PI / 2;
          const endAngle = ((slot.utcHour + 0.25) / 24) * Math.PI * 2 - Math.PI / 2;

          const citySlot = slot.cities.find(c => c.cityId === city.id);
          const isWork = citySlot ? citySlot.isWorkHour : false;
          const isGolden = citySlot ? citySlot.isGoldenHour : false;

          ctx.strokeStyle = isWork ? 'rgba(245, 158, 11, 0.85)' : (isGolden ? 'rgba(217, 119, 6, 0.45)' : 'rgba(51, 65, 85, 0.35)');
          if (isWork) {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
          }

          ctx.lineWidth = ringWidth - 4;
          ctx.beginPath();
          ctx.arc(cx, cy, (ringOuter + ringInner) / 2, startAngle, endAngle);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${city.flag} ${city.name}`, cx - 35, cy - (ringOuter + ringInner) / 2 + ringWidth / 2);
      });

      // Draw Center Core (Universal Overlap Highlight)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2π OVERLAP', cx, cy - 4);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText('MATRIX', cx, cy + 8);

      ctx.restore();
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }
}
