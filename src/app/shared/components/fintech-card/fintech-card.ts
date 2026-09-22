import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fintech-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fintech-card">
      @if (title) {
        <div class="card-header">
          @if (icon) {
            <span class="material-icons card-icon">{{ icon }}</span>
          }
          <h2 class="card-title">{{ title }}</h2>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .fintech-card {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 12px;
    }
    .card-icon { font-size: 20px; color: var(--color-money-green); }
    .card-title { font-size: 14px; font-weight: 700; color: var(--color-text-main); margin: 0; }
  `]
})
export class FintechCardComponent {
  @Input() title?: string;
  @Input() icon?: string;
}
