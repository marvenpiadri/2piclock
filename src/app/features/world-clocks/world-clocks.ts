import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorldViewComponent } from '../../shared/components/world-view/world-view';

@Component({
  selector: 'app-world-clocks',
  standalone: true,
  imports: [WorldViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-clocks.html',
  styleUrl: './world-clocks.css'
})
export class WorldClocksComponent {}
