import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<AppTheme>('light');

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem('xfacture_theme') as AppTheme | null;
      if (stored === 'dark' || stored === 'light') {
        this.theme.set(stored);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme.set('dark');
      }

      // Sync theme changes to DOM and localStorage
      effect(() => {
        const current = this.theme();
        this.applyThemeToDOM(current);
        try {
          localStorage.setItem('xfacture_theme', current);
        } catch {
          // Ignore storage quota or access errors
        }
      });
    }
  }

  toggleTheme(): void {
    this.theme.update(curr => (curr === 'light' ? 'dark' : 'light'));
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private applyThemeToDOM(t: AppTheme): void {
    if (!this.isBrowser) return;

    const root = document.documentElement;
    const body = document.body;

    if (t === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
      body?.setAttribute('data-theme', 'dark');
      body?.classList.add('theme-dark');
      body?.classList.remove('theme-light');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
      body?.setAttribute('data-theme', 'light');
      body?.classList.add('theme-light');
      body?.classList.remove('theme-dark');
    }
  }
}
