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
import { WeatherService } from '../../../core/services/weather.service';
import { CelestialState } from '../../../core/models/celestial.model';
import { WeatherData } from '../../../core/models/weather.model';

interface Star {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized (upper hemisphere)
  radius: number;
  baseBrightness: number;
  flickerSpeed: number;
  flickerPhase: number;
  color: string;
}

interface CloudParticle {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  radiusX: number;
  radiusY: number;
  opacity: number;
  speed: number;
  layer: number; // 0 = high/cirrus, 1 = mid/cumulus, 2 = low/stratus
}

interface PrecipParticle {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  size: number;
  opacity: number;
}



@Component({
  selector: 'app-reactive-sky',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reactive-sky.html',
  styleUrl: './reactive-sky.css'
})
export class ReactiveSkyComponent implements OnInit, OnDestroy {
  @ViewChild('skyCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private celestialService = inject(CelestialService);
  private weatherService = inject(WeatherService);

  readonly celestial = this.celestialService.celestialState;
  readonly weather = this.celestialService.currentWeather;

  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;

  // Star catalog (deterministic 250 stars)
  private stars: Star[] = [];

  // Procedural Clouds
  private clouds: CloudParticle[] = [];

  // Precipitation Particles
  private precipParticles: PrecipParticle[] = [];

  // Lightning state for thunderstorms
  private lightningTimer = 0;
  private lightningFlashAlpha = 0;

  // Motion preference
  private reducedMotion = false;
  private resizeHandler: (() => void) | null = null;

  constructor() {
    if (this.isBrowser) {
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
      this.initStars();
      this.initClouds();
      this.initPrecipParticles();
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false });

    this.setupResizeObserver();
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  private setupResizeObserver(): void {
    const canvas = this.canvasRef.nativeElement;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width;
      this.height = rect.height;

      canvas.width = Math.floor(this.width * this.dpr);
      canvas.height = Math.floor(this.height * this.dpr);

      if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    };

    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize, { passive: true });
  }

  private initStars(): void {
    const starCount = 220;
    this.stars = [];

    // Deterministic pseudo-random seed
    let seed = 42;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const colors = [
      'rgba(255, 255, 255,',
      'rgba(235, 245, 255,', // Blue-white
      'rgba(255, 240, 220,', // Warm gold
      'rgba(255, 250, 240,'  // White
    ];

    for (let i = 0; i < starCount; i++) {
      const x = rnd();
      // Stars concentrate higher in the sky (top 75%)
      const y = Math.pow(rnd(), 1.4) * 0.78;
      const radius = 0.6 + rnd() * 1.4;
      const baseBrightness = 0.35 + rnd() * 0.65;
      const flickerSpeed = 0.001 + rnd() * 0.004;
      const flickerPhase = rnd() * Math.PI * 2;
      const color = colors[Math.floor(rnd() * colors.length)];

      this.stars.push({
        x,
        y,
        radius,
        baseBrightness,
        flickerSpeed,
        flickerPhase,
        color
      });
    }
  }

  private initClouds(): void {
    this.clouds = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random(),
        y: 0.05 + Math.random() * 0.65,
        radiusX: 70 + Math.random() * 160,
        radiusY: 30 + Math.random() * 70,
        opacity: 0.15 + Math.random() * 0.35,
        speed: 0.00004 + Math.random() * 0.00012,
        layer: Math.floor(Math.random() * 3)
      });
    }
  }

  private initPrecipParticles(): void {
    this.precipParticles = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      this.precipParticles.push({
        x: Math.random(),
        y: Math.random(),
        speedY: 0.008 + Math.random() * 0.012,
        speedX: -0.002 + Math.random() * 0.001,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.6
      });
    }
  }



  private startRenderLoop(): void {
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min(time - lastTime, 100);
      lastTime = time;

      this.drawScene(time, delta);
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private drawScene(time: number, delta: number): void {
    if (!this.ctx || this.width === 0 || this.height === 0) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const celestial = this.celestial();
    const weather = this.weather();

    const sunAlt = celestial.sun.altitudeDeg;
    const sunAz = celestial.sun.azimuthDeg;
    const moonAlt = celestial.moon.altitudeDeg;

    // 1. Draw Multi-Stop Atmospheric Twilight & Sky Gradient
    this.drawSkyGradient(ctx, w, h, sunAlt, sunAz, weather);

    // 2. Astrolabe & Equinoctial Coordinate Vector Grid
    this.drawAstrolabeGrid(ctx, w, h, sunAlt, celestial);

    // 3. Draw Stars (modulated by Solar Altitude and Cloud Coverage)
    this.drawStars(ctx, w, h, sunAlt, celestial.starVisibilityFraction, weather, time);

    // 4. Draw Solar Horizon Flare / Glow
    this.drawSolarGlow(ctx, w, h, sunAlt, sunAz, weather);

    // 6. Draw Moon with Real Lunar Phase Disc and Position Angle
    if (moonAlt > -8) {
      this.drawMoon(ctx, w, h, celestial, weather);
    }

    // 7. Draw Sun Disc, UV Radiation Pulse & Corona
    if (sunAlt > -8) {
      this.drawSun(ctx, w, h, sunAlt, sunAz, weather, time);
    }

    // 8. Draw Layered Procedural Atmosphere Clouds
    this.drawClouds(ctx, w, h, sunAlt, weather, delta);

    // 9. Draw Weather Precipitation (Rain / Snow / Fog / Thunderstorm)
    this.drawWeatherEffects(ctx, w, h, weather, delta, time);

    // 10. Draw Clean Horizon Line Silhouette
    this.drawHorizon(ctx, w, h, sunAlt, weather);
  }

  /**
   * Astrolabe Celestial Coordinates & Marine Chronometer Vector Grid
   */
  private drawAstrolabeGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    celestial: CelestialState
  ): void {
    const horizonY = h * 0.82;
    const isNight = sunAlt < -6;
    const gridAlpha = isNight ? 0.08 : 0.04;

    ctx.save();
    ctx.strokeStyle = `rgba(245, 158, 11, ${gridAlpha})`;
    ctx.lineWidth = 0.75;
    ctx.setLineDash([3, 5]);

    // Altitude Circles (15°, 30°, 45°, 60°, 75°)
    const maxZenithY = horizonY * 0.08;
    const altSteps = [15, 30, 45, 60, 75];
    for (const alt of altSteps) {
      const normAlt = alt / 90;
      const y = horizonY - normAlt * (horizonY - maxZenithY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Azimuth Meridian Arcs (every 45°: N, NE, E, SE, S, SW, W, NW)
    for (let az = 0; az < 360; az += 45) {
      const x = this.projectAzimuthToScreenX(az, w);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, horizonY);
      ctx.stroke();
    }

    // Seasonal Solar Declination Curve arc
    const declination = celestial.sun.declinationDeg;
    // Map declination (-23.44° to +23.44°)
    const declRatio = (declination + 23.44) / 46.88;
    const declY = horizonY * 0.35 + (1 - declRatio) * horizonY * 0.3;

    ctx.strokeStyle = `rgba(251, 191, 36, ${(gridAlpha * 2).toFixed(3)})`;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, declY);
    ctx.bezierCurveTo(w * 0.25, declY - 25, w * 0.75, declY - 25, w, declY);
    ctx.stroke();

    ctx.restore();
  }



  /**
   * Continuous physics-based Sky Gradient interpolation based on Solar Altitude & Weather
   */
  private drawSkyGradient(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    _sunAz: number,
    weather: WeatherData
  ): void {
    // Base color palettes [Zenith, Mid, Horizon] in RGB
    // 1. Deep Night (alt <= -18)
    const night = {
      zenith: [2, 6, 23],
      mid: [8, 14, 34],
      horizon: [15, 23, 46]
    };

    // 2. Astronomical Twilight (-18 < alt <= -12)
    const astro = {
      zenith: [6, 12, 38],
      mid: [14, 22, 58],
      horizon: [28, 38, 76]
    };

    // 3. Nautical Twilight (-12 < alt <= -6)
    const nautical = {
      zenith: [12, 22, 65],
      mid: [30, 42, 98],
      horizon: [65, 68, 125]
    };

    // 4. Civil Twilight / Blue Hour (-6 < alt <= 0)
    const civil = {
      zenith: [22, 48, 110],
      mid: [75, 78, 145],
      horizon: [190, 115, 95]
    };

    // 5. Golden Hour / Sunrise-Sunset (0 < alt <= 6)
    const golden = {
      zenith: [38, 92, 170],
      mid: [115, 145, 210],
      horizon: [245, 175, 95]
    };

    // 6. Daytime (alt > 6)
    const day = {
      zenith: [24, 96, 192],
      mid: [70, 148, 228],
      horizon: [175, 215, 245]
    };

    let zRGB: number[];
    let mRGB: number[];
    let hRGB: number[];

    const lerpColor = (c1: number[], c2: number[], t: number): number[] => {
      const f = Math.max(0, Math.min(1, t));
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * f),
        Math.round(c1[1] + (c2[1] - c1[1]) * f),
        Math.round(c1[2] + (c2[2] - c1[2]) * f)
      ];
    };

    if (sunAlt <= -18) {
      zRGB = night.zenith;
      mRGB = night.mid;
      hRGB = night.horizon;
    } else if (sunAlt <= -12) {
      const f = (sunAlt + 18) / 6;
      zRGB = lerpColor(night.zenith, astro.zenith, f);
      mRGB = lerpColor(night.mid, astro.mid, f);
      hRGB = lerpColor(night.horizon, astro.horizon, f);
    } else if (sunAlt <= -6) {
      const f = (sunAlt + 12) / 6;
      zRGB = lerpColor(astro.zenith, nautical.zenith, f);
      mRGB = lerpColor(astro.mid, nautical.mid, f);
      hRGB = lerpColor(astro.horizon, nautical.horizon, f);
    } else if (sunAlt <= 0) {
      const f = (sunAlt + 6) / 6;
      zRGB = lerpColor(nautical.zenith, civil.zenith, f);
      mRGB = lerpColor(nautical.mid, civil.mid, f);
      hRGB = lerpColor(nautical.horizon, civil.horizon, f);
    } else if (sunAlt <= 6) {
      const f = sunAlt / 6;
      zRGB = lerpColor(civil.zenith, golden.zenith, f);
      mRGB = lerpColor(civil.mid, golden.mid, f);
      hRGB = lerpColor(civil.horizon, golden.horizon, f);
    } else {
      const f = Math.min(1, (sunAlt - 6) / 25);
      zRGB = lerpColor(golden.zenith, day.zenith, f);
      mRGB = lerpColor(golden.mid, day.mid, f);
      hRGB = lerpColor(golden.horizon, day.horizon, f);
    }

    // Atmospheric Weather Blending (Overcast / Rain desaturation & darkening)
    const overcastFactor = (weather.cloudCoverPct / 100) * (weather.condition === 'overcast' || weather.condition === 'heavy_rain' || weather.condition === 'thunderstorm' ? 0.75 : 0.4);
    if (overcastFactor > 0) {
      const isNight = sunAlt < -6;
      const grayZenith = isNight ? [10, 14, 22] : [75, 85, 100];
      const grayMid = isNight ? [18, 24, 36] : [105, 118, 135];
      const grayHorizon = isNight ? [28, 36, 50] : [145, 158, 175];

      zRGB = lerpColor(zRGB, grayZenith, overcastFactor);
      mRGB = lerpColor(mRGB, grayMid, overcastFactor);
      hRGB = lerpColor(hRGB, grayHorizon, overcastFactor);
    }

    // Create vertical linear gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${zRGB.join(',')})`);
    grad.addColorStop(0.55, `rgb(${mRGB.join(',')})`);
    grad.addColorStop(0.82, `rgb(${hRGB.join(',')})`);
    // Sub-horizon ground ambient
    const groundRGB = lerpColor(hRGB, [5, 8, 15], 0.65);
    grad.addColorStop(1, `rgb(${groundRGB.join(',')})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Deterministic Astronomical Stars
   */
  private drawStars(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    starVis: number,
    weather: WeatherData,
    time: number
  ): void {
    if (starVis <= 0.01) return;

    // Weather cloud occlusion on stars
    const cloudOcclusion = 1 - (weather.cloudCoverPct / 100) * 0.95;
    const finalAlpha = starVis * cloudOcclusion;
    if (finalAlpha <= 0.01) return;

    const horizonY = h * 0.82;

    for (const star of this.stars) {
      const sx = star.x * w;
      const sy = star.y * horizonY;

      // Subtle atmospheric scintillation
      const twinkle = 0.85 + Math.sin(time * star.flickerSpeed + star.flickerPhase) * 0.15;
      const alpha = star.baseBrightness * finalAlpha * twinkle;

      ctx.beginPath();
      ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${star.color} ${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  /**
   * Atmospheric Horizon Glow / Sunset Light spreading horizontally
   */
  private drawSolarGlow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    sunAz: number,
    weather: WeatherData
  ): void {
    if (sunAlt < -14 || sunAlt > 25) return;

    const horizonY = h * 0.82;
    // Map Sun Azimuth to screen X: assuming viewing roughly south/equator, or 0-360 wrapped
    const sunX = this.projectAzimuthToScreenX(sunAz, w);
    const glowRadius = Math.max(w * 0.4, 250);

    // Glow intensity peaks around sunset/sunrise (alt between -4 and +4)
    let intensity = 0;
    if (sunAlt <= 0) {
      intensity = Math.max(0, (sunAlt + 14) / 14) * 0.6;
    } else {
      intensity = Math.max(0, (25 - sunAlt) / 25) * 0.7;
    }

    // Cloud suppression
    intensity *= (1 - (weather.cloudCoverPct / 100) * 0.5);

    if (intensity <= 0.01) return;

    const radial = ctx.createRadialGradient(sunX, horizonY, 5, sunX, horizonY, glowRadius);
    const color = sunAlt < 2 ? '255, 125, 45,' : '255, 185, 75,';

    radial.addColorStop(0, `rgba(${color} ${(intensity * 0.75).toFixed(3)})`);
    radial.addColorStop(0.4, `rgba(${color} ${(intensity * 0.3).toFixed(3)})`);
    radial.addColorStop(1, `rgba(${color} 0)`);

    ctx.fillStyle = radial;
    ctx.fillRect(0, horizonY - glowRadius, w, glowRadius * 2);
  }

  /**
   * Realistic Sun with Solar Corona
   */
  private drawSun(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    sunAz: number,
    weather: WeatherData,
    time: number
  ): void {
    const horizonY = h * 0.82;
    const sunPos = this.projectCelestialToScreen(sunAlt, sunAz, w, horizonY);

    if (sunPos.y > h + 50) return;

    // Sun disc size
    const sunRadius = Math.max(14, Math.min(26, w * 0.022));

    // Sun temperature colors: midday bright white-gold, sunset warm amber/vermilion
    let coreColor = '255, 255, 255';
    let coronaColor = '255, 215, 120';
    let coronaAlpha = 0.5;

    if (sunAlt < 4) {
      coreColor = '255, 220, 150';
      coronaColor = '255, 100, 30';
      coronaAlpha = 0.7;
    } else if (sunAlt < 12) {
      coreColor = '255, 245, 200';
      coronaColor = '255, 170, 60';
      coronaAlpha = 0.6;
    }

    // Weather diffusion / overcast occlusion
    const cloudCover = weather.cloudCoverPct / 100;
    const sunDiscAlpha = Math.max(0.15, 1 - cloudCover * 0.85);

    // Multi-layer Corona
    const coronaRad = sunRadius * (3.5 + Math.max(0, sunAlt / 15));
    const corona = ctx.createRadialGradient(sunPos.x, sunPos.y, sunRadius * 0.8, sunPos.x, sunPos.y, coronaRad);
    corona.addColorStop(0, `rgba(${coronaColor}, ${(coronaAlpha * sunDiscAlpha).toFixed(3)})`);
    corona.addColorStop(0.5, `rgba(${coronaColor}, ${(coronaAlpha * 0.3 * sunDiscAlpha).toFixed(3)})`);
    corona.addColorStop(1, `rgba(${coronaColor}, 0)`);

    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, coronaRad, 0, Math.PI * 2);
    ctx.fill();

    // UV Index pulse ring if UV index is high (> 6)
    if (weather.uvIndex >= 6 && sunAlt > 10) {
      const uvPulse = (Math.sin(time * 0.004) + 1) * 0.5;
      const ringRad = sunRadius * (1.8 + uvPulse * 0.8);
      ctx.strokeStyle = `rgba(245, 158, 11, ${(0.3 + uvPulse * 0.3).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sunPos.x, sunPos.y, ringRad, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Solid Sun Disc
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${coreColor}, ${sunDiscAlpha.toFixed(3)})`;
    ctx.shadowColor = `rgba(${coronaColor}, 0.8)`;
    ctx.shadowBlur = sunRadius * 1.5;
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }

  /**
   * Realistic Moon with Accurate Geometric Phase Terminator & Limb Tilt
   */
  private drawMoon(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    celestial: CelestialState,
    weather: WeatherData
  ): void {
    const horizonY = h * 0.82;
    const moon = celestial.moon;
    const moonPos = this.projectCelestialToScreen(moon.altitudeDeg, moon.azimuthDeg, w, horizonY);

    if (moonPos.y > h + 50) return;

    const moonRadius = Math.max(12, Math.min(22, w * 0.018));
    const cloudCover = weather.cloudCoverPct / 100;
    const moonAlpha = Math.max(0.2, (1 - cloudCover * 0.8) * (celestial.sun.altitudeDeg < 0 ? 1 : 0.65));

    ctx.save();
    ctx.translate(moonPos.x, moonPos.y);

    // Rotate to position angle of bright limb (chi) relative to zenith
    const tiltRad = (moon.brightLimbAngleDeg - 90) * (Math.PI / 180);
    ctx.rotate(tiltRad);

    // 1. Soft Lunar Glow (prominent at night)
    if (celestial.sun.altitudeDeg < -4 && moon.illuminationFraction > 0.15) {
      const glowRad = moonRadius * (2.2 + moon.illuminationFraction * 1.8);
      const glow = ctx.createRadialGradient(0, 0, moonRadius * 0.9, 0, 0, glowRad);
      glow.addColorStop(0, `rgba(215, 230, 255, ${(0.35 * moonAlpha * moon.illuminationFraction).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(215, 230, 255, 0)');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Earthshine (faint dark disc background)
    ctx.beginPath();
    ctx.arc(0, 0, moonRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(30, 42, 65, ${(0.45 * moonAlpha).toFixed(3)})`;
    ctx.fill();

    // 3. Mathematical Phase Terminator Rendering
    // Fraction k in [0, 1]. Phase angle phi in [0, 180].
    // If k > 0.02 (not New Moon), render lit portion
    if (moon.illuminationFraction > 0.02) {
      const k = moon.illuminationFraction;

      ctx.beginPath();
      // Right hemisphere (bright limb)
      ctx.arc(0, 0, moonRadius, -Math.PI / 2, Math.PI / 2, false);

      // Terminator curve: ellipse with x-radius = moonRadius * (2k - 1)
      const terminatorRx = Math.abs((2 * k - 1) * moonRadius);
      const anticlockwise = k < 0.5;

      ctx.ellipse(0, 0, terminatorRx, moonRadius, 0, Math.PI / 2, -Math.PI / 2, anticlockwise);
      ctx.closePath();

      // Lunar disc surface texture / color
      const moonGrad = ctx.createLinearGradient(-moonRadius, -moonRadius, moonRadius, moonRadius);
      moonGrad.addColorStop(0, `rgba(255, 255, 245, ${moonAlpha.toFixed(3)})`);
      moonGrad.addColorStop(0.7, `rgba(235, 240, 250, ${moonAlpha.toFixed(3)})`);
      moonGrad.addColorStop(1, `rgba(210, 220, 235, ${moonAlpha.toFixed(3)})`);

      ctx.fillStyle = moonGrad;
      ctx.fill();

      // Subtle lunar maria crater hints
      if (moonRadius > 14) {
        ctx.fillStyle = `rgba(180, 190, 205, ${(0.25 * moonAlpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(moonRadius * 0.2, -moonRadius * 0.25, moonRadius * 0.28, 0, Math.PI * 2);
        ctx.arc(-moonRadius * 0.1, moonRadius * 0.15, moonRadius * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Procedural Layered Drift Clouds
   */
  private drawClouds(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    weather: WeatherData,
    delta: number
  ): void {
    const cloudCover = weather.cloudCoverPct / 100;
    if (cloudCover <= 0.05) return;

    const horizonY = h * 0.82;
    const isNight = sunAlt < -6;
    const isSunset = sunAlt >= -6 && sunAlt <= 6;

    // Cloud lighting: Sunlit gold/pink during sunset, crisp white at day, deep charcoal at night
    let cloudRGB = isNight ? [25, 35, 52] : (isSunset ? [240, 160, 130] : [245, 250, 255]);
    if (weather.condition === 'overcast' || weather.condition === 'thunderstorm') {
      cloudRGB = isNight ? [12, 16, 25] : [110, 120, 135];
    }

    const maxCloudsToDraw = Math.floor(this.clouds.length * cloudCover);

    for (let i = 0; i < maxCloudsToDraw; i++) {
      const cloud = this.clouds[i];

      if (!this.reducedMotion) {
        const windFactor = 0.35 + Math.min(2.5, weather.windSpeedKmh / 12);
        const windDirection = Math.cos((weather.windDirectionDeg * Math.PI) / 180);
        cloud.x += cloud.speed * delta * windFactor * (windDirection >= 0 ? 1 : -1);
        if (cloud.x > 1.2) cloud.x = -0.2;
      }

      const cx = cloud.x * w;
      const cy = cloud.y * horizonY;
      const rx = cloud.radiusX;
      const ry = cloud.radiusY;

      const grad = ctx.createRadialGradient(cx, cy, ry * 0.2, cx, cy, rx);
      const alpha = cloud.opacity * (0.4 + cloudCover * 0.6);

      grad.addColorStop(0, `rgba(${cloudRGB.join(',')}, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.6, `rgba(${cloudRGB.join(',')}, ${(alpha * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${cloudRGB.join(',')}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Precipitation & Atmospheric Weather (Rain / Snow / Fog / Thunderstorm)
   */
  private drawWeatherEffects(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    weather: WeatherData,
    delta: number,
    _time: number
  ): void {
    const cond = weather.condition;
    const horizonY = h * 0.82;

    // 1. Fog / Mist Haze Layer
    if (cond === 'fog' || weather.visibilityKm < 5) {
      const fogGrad = ctx.createLinearGradient(0, horizonY - 140, 0, h);
      fogGrad.addColorStop(0, 'rgba(210, 220, 235, 0)');
      fogGrad.addColorStop(0.6, 'rgba(210, 220, 235, 0.45)');
      fogGrad.addColorStop(1, 'rgba(190, 205, 225, 0.65)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY - 140, w, h - (horizonY - 140));
    }

    // 2. Thunderstorm Lightning Flash
    if (cond === 'thunderstorm') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 4500 && Math.random() < 0.015) {
        this.lightningFlashAlpha = 0.75 + Math.random() * 0.2;
        this.lightningTimer = 0;
      }

      if (this.lightningFlashAlpha > 0) {
        ctx.fillStyle = `rgba(235, 245, 255, ${this.lightningFlashAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        this.lightningFlashAlpha -= delta * 0.003;
      }
    }

    // 3. Precipitation Particles (Rain / Snow)
    const isRain = cond === 'rain' || cond === 'heavy_rain' || cond === 'thunderstorm';
    const isSnow = cond === 'snow';

    if (!isRain && !isSnow) return;

    const particleCount = cond === 'heavy_rain' || cond === 'thunderstorm' ? 160 : (isRain ? 90 : 80);

    for (let i = 0; i < particleCount; i++) {
      const p = this.precipParticles[i];

      if (!this.reducedMotion) {
        p.y += p.speedY * (isRain ? (cond === 'heavy_rain' ? 1.8 : 1.2) : 0.4);
        p.x += p.speedX;

        if (p.y > 1) {
          p.y = -0.05;
          p.x = Math.random();
        }
        if (p.x < -0.1) p.x = 1.1;
      }

      const px = p.x * w;
      const py = p.y * h;

      if (isRain) {
        const len = cond === 'heavy_rain' ? 22 : 14;
        ctx.strokeStyle = `rgba(195, 220, 250, ${(p.opacity * 0.65).toFixed(3)})`;
        ctx.lineWidth = cond === 'heavy_rain' ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.speedX * w * 0.05, py + len);
        ctx.stroke();
      } else if (isSnow) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(p.opacity * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Minimalist Ground Horizon Silhouette
   */
  private drawHorizon(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    sunAlt: number,
    _weather: WeatherData
  ): void {
    const horizonY = h * 0.82;
    const isNight = sunAlt < -6;
    const isSunset = sunAlt >= -6 && sunAlt <= 6;

    // Subtle atmospheric ridge terrain line
    ctx.beginPath();
    ctx.moveTo(0, horizonY);

    // Subtle gentle rolling curvature
    const segments = 8;
    const step = w / segments;
    for (let i = 1; i <= segments; i++) {
      const x = i * step;
      const yOffset = Math.sin((i / segments) * Math.PI) * 12 + ((i % 2 === 0) ? -4 : 4);
      ctx.lineTo(x, horizonY + yOffset);
    }

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const groundBaseColor = isNight ? 'rgb(6, 10, 18)' : (isSunset ? 'rgb(18, 24, 38)' : 'rgb(12, 18, 30)');
    ctx.fillStyle = groundBaseColor;
    ctx.fill();

    // Subtle horizon ambient line
    ctx.strokeStyle = isSunset ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Projects 3D celestial coordinates (altitude & azimuth) onto 2D viewport
   */
  private projectCelestialToScreen(
    altitudeDeg: number,
    azimuthDeg: number,
    w: number,
    horizonY: number
  ): { x: number; y: number } {
    // X is projected based on Azimuth (compass direction)
    const x = this.projectAzimuthToScreenX(azimuthDeg, w);

    // Y is projected based on Altitude above horizon
    // altitude 0° = horizonY, altitude 90° (zenith) = 0.08 * horizonY, altitude < 0 = below horizon
    const maxZenithY = horizonY * 0.08;
    const normalizedAlt = altitudeDeg / 90; // 0 to 1 (or negative)
    const y = horizonY - (normalizedAlt * (horizonY - maxZenithY));

    return { x, y };
  }

  private projectAzimuthToScreenX(azimuthDeg: number, w: number): number {
    // Center viewport on South (180° in Northern Hemisphere) or smoothly sweep
    // Standard mapping: 0° (North) -> Left/Right edge, 90° (East) -> 25%, 180° (South) -> 50%, 270° (West) -> 75%
    const norm = (azimuthDeg % 360) / 360;
    return norm * w;
  }
}
