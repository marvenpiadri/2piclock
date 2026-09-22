import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { calculateSubsolarPoint } from '../../../core/astronomy/astronomy-engine';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-terminator-ribbon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="terminator-container glass-panel">
      <div class="terminator-header flex justify-between items-center mb-2">
        <span class="font-mono text-xs text-amber-400 tracking-widest uppercase flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Dynamic Terminator Line World Ribbon
        </span>
        <span class="font-mono text-xs text-slate-400">{{ currentDateString }}</span>
      </div>
      <div class="canvas-wrapper relative w-full h-24 overflow-hidden rounded-xl border border-amber-500/20 bg-slate-950/80 cursor-pointer shadow-inner" (click)="onRibbonClick($event)" title="Click ribbon to jump to closest planetary meridian">
        <canvas #ribbonCanvas class="w-full h-full block"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .terminator-container {
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 1rem;
    }
  `]
})
export class TerminatorRibbonComponent implements OnInit, OnDestroy {
  @ViewChild('ribbonCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() activeDate: Date = new Date();

  private platformId = inject(PLATFORM_ID);
  private locationService = inject(LocationService);
  private animFrameId: number | null = null;

  get currentDateString(): string {
    return this.activeDate.toUTCString().slice(0, 22);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startRender();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private startRender(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
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

      const subsolar = calculateSubsolarPoint(this.activeDate);
      const subsolarX = ((subsolar.longitude + 180) / 360) * width;

      // Draw World Ribbon Map background (Longitudinal night/day gradient)
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      
      for (let x = 0; x <= width; x += width / 25) {
        const lng = (x / width) * 360 - 180;
        let diff = Math.abs(lng - subsolar.longitude);
        if (diff > 180) diff = 360 - diff;

        let alpha = 0.85;
        let r = 2, g = 6, b = 23;

        if (diff < 80) {
          r = 14; g = 116; b = 144;
          alpha = 0.4 + (1 - diff / 80) * 0.4;
        } else if (diff >= 80 && diff <= 100) {
          r = 245; g = 158; b = 11;
          alpha = 0.8;
        }

        const stopPos = x / width;
        grad.addColorStop(Math.max(0, Math.min(1, stopPos)), `rgba(${r}, ${g}, ${b}, ${alpha})`);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Equator Line
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Subsolar Marker
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(subsolarX, height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Pinned Cities on Ribbon
      const presets = this.locationService.allPresets;
      presets.forEach((city: any) => {
        const cx = ((city.longitude + 180) / 360) * width;
        const cy = height * 0.5 - (city.latitude / 90) * (height * 0.35);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.font = '9px monospace';
        ctx.fillText(city.flag + ' ' + city.name.slice(0, 7), cx + 6, cy + 3);
      });

      // Subsolar coordinates label
      ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
      ctx.font = '10px monospace';
      ctx.fillText(`☀️ Subsolar Point: Lat ${subsolar.latitude.toFixed(1)}° | Lng ${subsolar.longitude.toFixed(1)}°`, 12, 18);

      ctx.restore();
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  onRibbonClick(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    const clickedLng = ratio * 360 - 180;
    const presets = this.locationService.allPresets;
    let closest = presets[0];
    let minDiff = 360;
    presets.forEach((p: any) => {
      const diff = Math.abs(p.longitude - clickedLng);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });
    if (closest) {
      this.locationService.selectLocation(closest);
    }
  }
}
