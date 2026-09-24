import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RadioService } from '../../core/services/radio.service';
import { RadioStation } from '../../core/models/radio.model';
import { LocationService } from '../../core/services/location.service';
import { TimeControlService } from '../../core/services/time-control.service';

export type RadioTab = 'explore' | 'map' | 'favorites' | 'recents';

@Component({
  selector: 'app-world-radio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './world-radio.html',
  styleUrl: './world-radio.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorldRadioComponent implements OnInit {
  readonly radioService = inject(RadioService);
  readonly locationService = inject(LocationService);
  readonly timeService = inject(TimeControlService);
  private route = inject(ActivatedRoute);

  readonly activeTab = signal<RadioTab>('explore');
  readonly searchQuery = signal<string>('');
  readonly selectedGenre = signal<string>('all');
  readonly selectedContinent = signal<string>('all');
  readonly hoveredStation = signal<RadioStation | null>(null);

  readonly genres = [
    { id: 'all', label: 'All Streams' },
    { id: 'ambient', label: 'Ambient & Drone' },
    { id: 'jazz', label: 'World Jazz' },
    { id: 'electronic', label: 'Electronic & Synth' },
    { id: 'lo-fi', label: 'Lo-Fi & Chill' },
    { id: 'city-pop', label: 'City Pop' },
    { id: 'classical', label: 'Classical & Piano' },
    { id: 'traditional', label: 'Traditional & Folk' },
    { id: 'space', label: 'Deep Space' }
  ];

  readonly continents = [
    { id: 'all', label: 'Worldwide' },
    { id: 'asia', label: 'Asia Pacific' },
    { id: 'europe', label: 'Europe' },
    { id: 'americas', label: 'Americas' },
    { id: 'africa', label: 'Africa & Middle East' }
  ];

  // Expose signals from radioService
  readonly currentStation = this.radioService.currentStation;
  readonly isPlaying = this.radioService.isPlaying;
  readonly isLoading = this.radioService.isLoading;
  readonly volume = this.radioService.volume;
  readonly isMuted = this.radioService.isMuted;
  readonly error = this.radioService.error;
  readonly playingContext = this.radioService.playingLocationContext;
  readonly favorites = this.radioService.favorites;
  readonly recents = this.radioService.recentStations;

  readonly allStations = this.radioService.searchResults;

  readonly filteredStations = computed<RadioStation[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const g = this.selectedGenre();
    const c = this.selectedContinent();
    const tab = this.activeTab();

    if (tab === 'favorites') {
      return this.favorites();
    }
    if (tab === 'recents') {
      return this.recents();
    }

    return this.radioService.searchResults().filter(s => {
      // Query filter
      const matchQ = !q || 
        s.name.toLowerCase().includes(q) || 
        s.city.toLowerCase().includes(q) || 
        s.country.toLowerCase().includes(q) || 
        s.tags.some(t => t.toLowerCase().includes(q));

      // Genre filter
      const matchG = g === 'all' || s.tags.some(t => t.toLowerCase().includes(g));

      // Continent filter
      let matchC = true;
      if (c === 'asia') {
        matchC = ['Japan', 'South Korea', 'China', 'Australia', 'India', 'Singapore', 'Thailand'].includes(s.country);
      } else if (c === 'europe') {
        matchC = ['United Kingdom', 'France', 'Germany', 'Iceland', 'Spain', 'Italy', 'Norway', 'Sweden'].includes(s.country);
      } else if (c === 'americas') {
        matchC = ['United States', 'Canada', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Colombia'].includes(s.country);
      } else if (c === 'africa') {
        matchC = ['Morocco', 'Egypt', 'South Africa', 'Kenya', 'Nigeria', 'United Arab Emirates', 'Saudi Arabia'].includes(s.country);
      }

      return matchQ && matchG && matchC;
    });
  });

  // Map representation coordinates
  readonly mapStations = computed(() => {
    return this.allStations().map(s => {
      // Equirectangular projection coordinates
      const xPercent = ((s.longitude + 180) / 360) * 100;
      const yPercent = ((90 - s.latitude) / 180) * 100;
      const isCurrent = this.currentStation()?.id === s.id;
      return {
        ...s,
        xPercent,
        yPercent,
        isCurrent
      };
    });
  });

  ngOnInit(): void {
    // Populate the initial directory from Radio Browser's non-broken stations.
    // The local list remains only as a fallback if the directory is unavailable.
    this.radioService.loadGlobalStations(48);

    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['explore', 'map', 'favorites', 'recents'].includes(params['tab'])) {
        this.activeTab.set(params['tab'] as RadioTab);
      }
      if (params['search']) {
        this.searchQuery.set(params['search']);
        this.onSearchChange();
      }
      if (params['play']) {
        const target = this.allStations().find(s => s.id === params['play'] || s.city.toLowerCase() === params['play'].toLowerCase());
        if (target) {
          this.radioService.playStation(target);
        }
      }
    });
  }

  setTab(tab: RadioTab): void {
    this.activeTab.set(tab);
  }

  onSearchChange(): void {
    this.radioService.searchStations({
      query: this.searchQuery(),
      tag: this.selectedGenre() !== 'all' ? this.selectedGenre() : undefined
    });
  }

  setGenre(genreId: string): void {
    this.selectedGenre.set(genreId);
    this.onSearchChange();
  }

  setContinent(contId: string): void {
    this.selectedContinent.set(contId);
  }

  playStation(station: RadioStation): void {
    this.radioService.playStation(station);
  }

  togglePlay(): void {
    this.radioService.togglePlay();
  }

  toggleFavorite(station: RadioStation, event: Event): void {
    event.stopPropagation();
    this.radioService.toggleFavorite(station);
  }

  isFavorite(station: RadioStation): boolean {
    return this.radioService.isStationFavorite(station);
  }

  setVolume(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.radioService.setVolume(val);
  }

  toggleMute(): void {
    this.radioService.toggleMute();
  }

  getSolarAltitudeDisplay(deg: number): string {
    return `${deg >= 0 ? '+' : ''}${deg.toFixed(1)}°`;
  }
}
