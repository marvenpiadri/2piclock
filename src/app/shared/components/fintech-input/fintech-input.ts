import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-fintech-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="field-group">
      <label class="input-label" [for]="id">{{ label }}</label>
      <div class="input-symbol-wrap" [class.prefix]="prefix" [class.suffix]="suffix">
        @if (prefix) { <span class="input-affix">{{ prefix }}</span> }
        <input
          [id]="id"
          [type]="type"
          [ngModel]="value"
          (ngModelChange)="valueChange.emit($event)"
          [min]="min"
          [max]="max"
          [step]="step"
          class="fintech-input"
        />
        @if (suffix) { <span class="input-affix">{{ suffix }}</span> }
      </div>
      @if (hint) { <span class="field-micro-hint">{{ hint }}</span> }
    </div>
  `,
  styles: [`
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .input-label { font-size: 11.5px; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .input-symbol-wrap { position: relative; display: flex; align-items: center; }
    .input-affix { position: absolute; color: var(--color-text-muted); font-size: 13px; font-weight: 700; pointer-events: none; }
    .input-symbol-wrap.prefix .input-affix { left: 12px; }
    .input-symbol-wrap.suffix .input-affix { right: 12px; }
    .fintech-input { width: 100%; height: 40px; background-color: var(--color-input-bg); border: 1px solid var(--color-input-border); border-radius: 8px; color: var(--color-input-text); font-size: 14px; font-family: var(--font-mono); padding: 0 12px; transition: all 0.15s ease; }
    .input-symbol-wrap.prefix .fintech-input { padding-left: 28px; }
    .input-symbol-wrap.suffix .fintech-input { padding-right: 28px; }
    .fintech-input:focus { outline: none; border-color: var(--color-border-focus); box-shadow: 0 0 0 3px var(--color-money-green-light); }
    .field-micro-hint { font-size: 11px; color: var(--color-text-muted); }
  `]
})
export class FintechInputComponent {
  @Input() id!: string;
  @Input() label!: string;
  @Input() type = 'number';
  @Input() value: any;
  @Input() prefix?: string;
  @Input() suffix?: string;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  @Input() hint?: string;
  @Output() valueChange = new EventEmitter<number>();
}
