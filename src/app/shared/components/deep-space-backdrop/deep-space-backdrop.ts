import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CelestialService } from '../../../core/services/celestial.service';

interface DeepStar {
  x: number; // 0 to 1
  y: number; // 0 to 1
  z: number; // depth layer 0.2 to 1
  radius: number;
  color: string;
  flickerSpeed: number;
  flickerPhase: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  color: string;
  alive: boolean;
}

interface ConstellationEdge {
  fromIndex: number;
  toIndex: number;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
}

@Component({
  selector: 'app-deep-space-backdrop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deep-space-backdrop.html',
  styleUrl: './deep-space-backdrop.css'
})
export class DeepSpaceBackdropComponent implements OnInit, OnDestroy {
  @ViewChild('spaceCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private celestialService = inject(CelestialService);

  readonly celestial = this.celestialService.celestialState;

  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private stars: DeepStar[] = [];
  private meteors: Meteor[] = [];
  private nebulae: NebulaCloud[] = [];
  private constellationStars: { x: number; y: number; name: string }[] = [];
  private constellationEdges: ConstellationEdge[] = [];
  private lastMeteorTime = 0;

  ngOnInit(): void {
    if (this.isBrowser) {
      this.initCanvas();
      this.initStarfield();
      this.initNebulae();
      this.initConstellations();
      this.startRenderLoop();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.isBrowser) {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.handleResize();
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private handleResize = (): void => {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }
  };

  private initStarfield(): void {
    this.stars = [];
    const colors = [
      '#93c5fd', // O/B Blue-white
      '#ffffff', // A White
      '#fef08a', // F/G Yellow
      '#fed7aa', // K Orange
      '#fca5a5'  // M Red
    ];

    for (let i = 0; i < 420; i++) {
      const z = Math.random() * 0.8 + 0.2; // depth
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z,
        radius: Math.max(0.6, z * 1.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        flickerSpeed: 0.8 + Math.random() * 2.5,
        flickerPhase: Math.random() * Math.PI * 2
      });
    }
  }

  private initNebulae(): void {
    this.nebulae = [
      {
        x: 0.25,
        y: 0.35,
        radius: 380,
        color: 'rgba(99, 102, 241, 0.08)', // Indigo
        pulseSpeed: 0.4,
        pulsePhase: 0
      },
      {
        x: 0.72,
        y: 0.45,
        radius: 440,
        color: 'rgba(168, 85, 247, 0.07)', // Purple
        pulseSpeed: 0.35,
        pulsePhase: 1.2
      },
      {
        x: 0.45,
        y: 0.75,
        radius: 360,
        color: 'rgba(217, 70, 239, 0.06)', // Magenta
        pulseSpeed: 0.5,
        pulsePhase: 2.1
      },
      {
        x: 0.85,
        y: 0.2,
        radius: 320,
        color: 'rgba(56, 189, 248, 0.06)', // Cyan
        pulseSpeed: 0.3,
        pulsePhase: 3.0
      }
    ];
  }

  private initConstellations(): void {
    // Orion & Cassiopeia normalized star anchors
    this.constellationStars = [
      // Orion: Betelgeuse, Bellatrix, Alnitak, Alnilam, Mintaka, Saiph, Rigel
      { x: 0.18, y: 0.28, name: 'Betelgeuse' },
      { x: 0.26, y: 0.31, name: 'Bellatrix' },
      { x: 0.21, y: 0.39, name: 'Alnitak' },
      { x: 0.23, y: 0.40, name: 'Alnilam' },
      { x: 0.25, y: 0.41, name: 'Mintaka' },
      { x: 0.19, y: 0.50, name: 'Saiph' },
      { x: 0.27, y: 0.48, name: 'Rigel' },
      // Cassiopeia: W shape
      { x: 0.74, y: 0.18, name: 'Caph' },
      { x: 0.78, y: 0.22, name: 'Schedar' },
      { x: 0.82, y: 0.19, name: 'Navi' },
      { x: 0.86, y: 0.24, name: 'Ruchbah' },
      { x: 0.90, y: 0.20, name: 'Segin' }
    ];

    this.constellationEdges = [
      // Orion
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 0, toIndex: 2 },
      { fromIndex: 1, toIndex: 4 },
      { fromIndex: 2, toIndex: 3 },
      { fromIndex: 3, toIndex: 4 },
      { fromIndex: 2, toIndex: 5 },
      { fromIndex: 4, toIndex: 6 },
      // Cassiopeia
      { fromIndex: 7, toIndex: 8 },
      { fromIndex: 8, toIndex: 9 },
      { fromIndex: 9, toIndex: 10 },
      { fromIndex: 10, toIndex: 11 }
    ];
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      this.render(timestamp);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private render(timestamp: number): void {
    if (!this.ctx || this.width === 0 || this.height === 0) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const tSec = timestamp / 1000;

    // 1. Deep Space Cosmic Void (Solid Black with subtle galactic core)
    ctx.fillStyle = '#010206';
    ctx.fillRect(0, 0, w, h);

    // 2. Cosmic Nebulae Clouds (Volumetric breathing dust)
    this.renderNebulae(ctx, w, h, tSec);

    // 3. Constellation Geometric Traces
    this.renderConstellations(ctx, w, h, tSec);

    // 4. Parallax Starfield with realistic stellar flicker
    this.renderStarfield(ctx, w, h, tSec);

    // 5. Streaking Meteors / Bolides
    this.updateAndRenderMeteors(ctx, w, h, tSec);
  }

  private renderNebulae(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number
  ): void {
    ctx.save();
    for (const neb of this.nebulae) {
      const cx = neb.x * w;
      const cy = neb.y * h;
      const pulse = 1 + 0.12 * Math.sin(tSec * neb.pulseSpeed + neb.pulsePhase);
      const rad = neb.radius * pulse;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(0.5, neb.color.replace('0.08', '0.04').replace('0.07', '0.03'));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderConstellations(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number
  ): void {
    ctx.save();
    const pulseAlpha = 0.22 + 0.08 * Math.sin(tSec * 0.8);

    // Render Edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(165, 180, 252, ${pulseAlpha})`;
    ctx.setLineDash([3, 4]);

    for (const edge of this.constellationEdges) {
      const p1 = this.constellationStars[edge.fromIndex];
      const p2 = this.constellationStars[edge.toIndex];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Render Major Constellation Anchor Stars
    for (const star of this.constellationStars) {
      const sx = star.x * w;
      const sy = star.y * h;

      // Halo
      ctx.fillStyle = 'rgba(165, 180, 252, 0.4)';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Subtle label
      ctx.fillStyle = 'rgba(199, 210, 254, 0.35)';
      ctx.font = '8px monospace';
      ctx.fillText(star.name, sx + 6, sy - 3);
    }

    ctx.restore();
  }

  private renderStarfield(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number
  ): void {
    ctx.save();
    for (const star of this.stars) {
      const sx = star.x * w;
      const sy = star.y * h;
      const flicker = 0.65 + 0.35 * Math.sin(tSec * star.flickerSpeed + star.flickerPhase);

      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.z * flicker;
      ctx.beginPath();
      ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
      ctx.fill();

      // Diffraction cross-spikes on brightest close stars
      if (star.z > 0.88 && star.radius > 1.4) {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.3 * flicker;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx, sy + 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private updateAndRenderMeteors(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number
  ): void {
    // Spawn meteor every 3.5 - 6.5 seconds
    if (tSec - this.lastMeteorTime > 3.8 && Math.random() < 0.04) {
      this.lastMeteorTime = tSec;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3; // ~45 deg
      const speed = 12 + Math.random() * 8;
      this.meteors.push({
        x: Math.random() * w * 0.8,
        y: Math.random() * h * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 80 + Math.random() * 120,
        alpha: 1,
        color: Math.random() > 0.3 ? '#67e8f9' : '#fef08a',
        alive: true
      });
    }

    ctx.save();
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.alpha -= 0.025;

      if (m.alpha <= 0 || m.x > w + 100 || m.y > h + 100) {
        this.meteors.splice(i, 1);
        continue;
      }

      const grad = ctx.createLinearGradient(
        m.x,
        m.y,
        m.x - (m.vx / 10) * m.length,
        m.y - (m.vy / 10) * m.length
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, m.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = m.alpha;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - (m.vx / 10) * m.length, m.y - (m.vy / 10) * m.length);
      ctx.stroke();
    }
    ctx.restore();
  }
}
