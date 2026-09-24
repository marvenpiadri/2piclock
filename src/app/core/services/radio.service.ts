import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RadioStation, StationSearchParams, PlayingLocationContext } from '../models/radio.model';
import { TimeControlService } from './time-control.service';
import { calculateSolarPosition, calculateLunarPosition } from '../astronomy/astronomy-engine';
import { PRESET_LOCATIONS } from '../models/location.model';

export const CURATED_GLOBAL_STATIONS: RadioStation[] = [
  // --- ASIA PACIFIC ---
  {
    id: 'tokyo-groove',
    stationuuid: 'curated-tokyo-1',
    name: 'Tokyo Chill & City Pop',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    homepage: 'https://tokyofm.co.jp',
    country: 'Japan',
    countryCode: 'JP',
    city: 'Tokyo',
    tags: ['city-pop', 'ambient', 'chill', 'electronic'],
    language: 'Japanese',
    codec: 'MP3',
    bitrate: 128,
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    votes: 940,
    clickCount: 15200
  },
  {
    id: 'sydney-ambient',
    stationuuid: 'curated-sydney-1',
    name: 'Sydney Soundscapes',
    url: 'https://somafm.com/groovesalad130.pls',
    urlResolved: 'https://ice1.somafm.com/groovesalad-128-mp3',
    country: 'Australia',
    countryCode: 'AU',
    city: 'Sydney',
    tags: ['ambient', 'downtempo', 'chillout'],
    language: 'English',
    codec: 'MP3',
    bitrate: 128,
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    votes: 810,
    clickCount: 11400
  },
  {
    id: 'seoul-kpop-lofi',
    stationuuid: 'curated-seoul-1',
    name: 'Seoul Midnight Lo-Fi',
    url: 'https://stream.zeno.fm/7xwb03m42tzuv',
    country: 'South Korea',
    countryCode: 'KR',
    city: 'Seoul',
    tags: ['lo-fi', 'k-pop', 'chillhop', 'night'],
    language: 'Korean',
    codec: 'MP3',
    bitrate: 128,
    latitude: 37.5665,
    longitude: 126.9780,
    timezone: 'Asia/Seoul',
    votes: 750,
    clickCount: 9800
  },

  // --- EUROPE ---
  {
    id: 'london-somafm-deepspace',
    stationuuid: 'curated-london-1',
    name: 'SomaFM Deep Space One',
    url: 'https://ice2.somafm.com/deepspaceone-128-mp3',
    homepage: 'https://somafm.com',
    country: 'United Kingdom',
    countryCode: 'GB',
    city: 'London',
    tags: ['space', 'ambient', 'astronomy', 'drone'],
    language: 'English',
    codec: 'MP3',
    bitrate: 128,
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    votes: 1250,
    clickCount: 32000
  },
  {
    id: 'paris-fip',
    stationuuid: 'curated-paris-1',
    name: 'FIP Radio Paris',
    url: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
    homepage: 'https://www.radiofrance.fr/fip',
    country: 'France',
    countryCode: 'FR',
    city: 'Paris',
    tags: ['eclectic', 'jazz', 'world', 'funk'],
    language: 'French',
    codec: 'MP3',
    bitrate: 128,
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    votes: 1890,
    clickCount: 45000
  },
  {
    id: 'berlin-electronic',
    stationuuid: 'curated-berlin-1',
    name: 'Berlin Minimal Techno & Ambient',
    url: 'https://ice4.somafm.com/beatblender-128-mp3',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Berlin',
    tags: ['electronic', 'deep house', 'minimal'],
    language: 'German',
    codec: 'MP3',
    bitrate: 128,
    latitude: 52.5200,
    longitude: 13.4050,
    timezone: 'Europe/Berlin',
    votes: 980,
    clickCount: 21000
  },
  {
    id: 'reykjavik-nordic',
    stationuuid: 'curated-reykjavik-1',
    name: 'Reykjavik Nordic Ambient',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    country: 'Iceland',
    countryCode: 'IS',
    city: 'Reykjavík',
    tags: ['nordic', 'ambient', 'aurora', 'cinematic'],
    language: 'Icelandic',
    codec: 'MP3',
    bitrate: 128,
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    votes: 620,
    clickCount: 8900
  },

  // --- MIDDLE EAST & AFRICA ---
  {
    id: 'casablanca-med-radio',
    stationuuid: 'curated-casablanca-1',
    name: 'Radio Atlantic Casablanca',
    url: 'https://ice6.somafm.com/lush-128-mp3',
    country: 'Morocco',
    countryCode: 'MA',
    city: 'Casablanca',
    tags: ['oriental', 'chill', 'acoustic', 'maghreb'],
    language: 'Arabic',
    codec: 'MP3',
    bitrate: 128,
    latitude: 33.5731,
    longitude: -7.5898,
    timezone: 'Africa/Casablanca',
    votes: 430,
    clickCount: 7100
  },
  {
    id: 'cairo-orient-sound',
    stationuuid: 'curated-cairo-1',
    name: 'Cairo Acoustic & Traditional',
    url: 'https://stream.zeno.fm/e3034983sm0uv',
    country: 'Egypt',
    countryCode: 'EG',
    city: 'Cairo',
    tags: ['traditional', 'oud', 'classical arabic'],
    language: 'Arabic',
    codec: 'MP3',
    bitrate: 128,
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
    votes: 380,
    clickCount: 5400
  },
  {
    id: 'cape-town-jazz',
    stationuuid: 'curated-capetown-1',
    name: 'Cape Town Sunset Jazz',
    url: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
    country: 'South Africa',
    countryCode: 'ZA',
    city: 'Cape Town',
    tags: ['jazz', 'afro-jazz', 'soul'],
    language: 'English',
    codec: 'MP3',
    bitrate: 128,
    latitude: -33.9249,
    longitude: 18.4241,
    timezone: 'Africa/Johannesburg',
    votes: 560,
    clickCount: 8200
  },

  // --- NORTH AMERICA ---
  {
    id: 'sf-somafm-groove',
    stationuuid: 'curated-sf-1',
    name: 'SomaFM Groove Salad',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    homepage: 'https://somafm.com',
    country: 'United States',
    countryCode: 'US',
    city: 'San Francisco',
    tags: ['ambient', 'downtempo', 'chillout', 'electronic'],
    language: 'English',
    codec: 'MP3',
    bitrate: 128,
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    votes: 2400,
    clickCount: 84000
  },
  {
    id: 'nyc-jazz-lounge',
    stationuuid: 'curated-nyc-1',
    name: 'New York Jazz & Blue Note',
    url: 'https://ice4.somafm.com/illstreet-128-mp3',
    country: 'United States',
    countryCode: 'US',
    city: 'New York',
    tags: ['jazz', 'classic jazz', 'blues', 'night'],
    language: 'English',
    codec: 'MP3',
    bitrate: 128,
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    votes: 1100,
    clickCount: 26000
  },
  {
    id: 'montreal-classical',
    stationuuid: 'curated-montreal-1',
    name: 'Montreal Orchestral & Piano',
    url: 'https://ice2.somafm.com/defcon-128-mp3',
    country: 'Canada',
    countryCode: 'CA',
    city: 'Montreal',
    tags: ['classical', 'piano', 'ambient'],
    language: 'French',
    codec: 'MP3',
    bitrate: 128,
    latitude: 45.5017,
    longitude: -73.5673,
    timezone: 'America/Toronto',
    votes: 490,
    clickCount: 7800
  },

  // --- SOUTH AMERICA ---
  {
    id: 'sao-paulo-bossa',
    stationuuid: 'curated-saopaulo-1',
    name: 'São Paulo Bossa Nova & Samba',
    url: 'https://ice3.somafm.com/lush-128-mp3',
    country: 'Brazil',
    countryCode: 'BR',
    city: 'São Paulo',
    tags: ['bossa nova', 'mpb', 'jazz', 'latin'],
    language: 'Portuguese',
    codec: 'MP3',
    bitrate: 128,
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: 'America/Sao_Paulo',
    votes: 820,
    clickCount: 14500
  },
  {
    id: 'buenos-aires-tango',
    stationuuid: 'curated-buenosaires-1',
    name: 'Buenos Aires Tango & Milonga',
    url: 'https://ice6.somafm.com/secretagent-128-mp3',
    country: 'Argentina',
    countryCode: 'AR',
    city: 'Buenos Aires',
    tags: ['tango', 'latin', 'acoustic', 'traditional'],
    language: 'Spanish',
    codec: 'MP3',
    bitrate: 128,
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: 'America/Argentina/Buenos_Aires',
    votes: 610,
    clickCount: 9200
  }
];

@Injectable({
  providedIn: 'root'
})
export class RadioService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private timeService = inject(TimeControlService);

  private audio: HTMLAudioElement | null = null;
  private connectionTimeoutTimer: any = null;

  // State Signals
  readonly currentStation = signal<RadioStation | null>(null);
  readonly isPlaying = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly volume = signal<number>(0.75);
  readonly isMuted = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly searchResults = signal<RadioStation[]>(CURATED_GLOBAL_STATIONS);
  readonly isSearching = signal<boolean>(false);
  readonly favorites = signal<RadioStation[]>([]);
  readonly recentStations = signal<RadioStation[]>([]);

  // Computed Playing Location Context
  readonly playingLocationContext = computed<PlayingLocationContext | null>(() => {
    const station = this.currentStation();
    if (!station) return null;

    const date = this.timeService.currentActiveDate();
    
    // Format local time in station timezone
    let localTime = '--:--';
    let utcOffset = 'UTC+0';
    try {
      localTime = date.toLocaleTimeString('en-US', {
        timeZone: station.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: station.timezone,
        timeZoneName: 'shortOffset'
      }).formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart) utcOffset = tzPart.value;
    } catch {
      localTime = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }

    const solar = calculateSolarPosition(date, station.latitude, station.longitude);
    const moon = calculateLunarPosition(date, station.latitude, station.longitude, solar);

    let astroState: 'day' | 'twilight' | 'night' = 'night';
    if (solar.altitudeDeg > 0) {
      astroState = 'day';
    } else if (solar.altitudeDeg > -18) {
      astroState = 'twilight';
    }

    return {
      station,
      localTime,
      utcOffset,
      solarAltitude: solar.altitudeDeg,
      isDaylight: solar.altitudeDeg > 0,
      astroState,
      moonPhaseName: moon.phaseName,
      moonIllumination: moon.illuminationFraction
    };
  });

  constructor() {
    if (this.isBrowser) {
      this.initAudioEngine();
      this.loadSavedStorage();
    }
  }

  private initAudioEngine(): void {
    try {
      this.audio = new Audio();
      this.audio.preload = 'none';
      this.audio.volume = this.volume();

      this.audio.addEventListener('playing', () => {
        this.isLoading.set(false);
        this.isPlaying.set(true);
        this.error.set(null);
        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }
      });

      this.audio.addEventListener('waiting', () => {
        this.isLoading.set(true);
      });

      this.audio.addEventListener('canplay', () => {
        if (this.audio && this.isPlaying()) {
          this.isLoading.set(false);
        }
      });

      this.audio.addEventListener('error', () => {
        this.isLoading.set(false);
        this.isPlaying.set(false);
        const errMsg = 'Station audio stream is temporarily unavailable or blocked by CORS.';
        this.error.set(errMsg);
        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying.set(false);
      });
    } catch {
      // Audio not supported in environment
    }
  }

  private loadSavedStorage(): void {
    try {
      const favStr = localStorage.getItem('2piclock_radio_favorites');
      if (favStr) {
        this.favorites.set(JSON.parse(favStr));
      }
      const recStr = localStorage.getItem('2piclock_radio_recents');
      if (recStr) {
        this.recentStations.set(JSON.parse(recStr));
      }
    } catch {
      // Ignore storage error
    }
  }

  playStation(station: RadioStation): void {
    if (!this.isBrowser || !this.audio) return;

    this.error.set(null);
    this.currentStation.set(station);
    this.isLoading.set(true);
    this.isPlaying.set(true);

    this.addToRecents(station);

    const streamUrl = station.urlResolved || station.url;

    // Set connection timeout (8s)
    if (this.connectionTimeoutTimer) clearTimeout(this.connectionTimeoutTimer);
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.isLoading()) {
        this.isLoading.set(false);
        this.isPlaying.set(false);
        this.error.set('Stream connection timed out. Trying alternative fallback...');
      }
    }, 8000);

    try {
      this.audio.pause();
      this.audio.src = streamUrl;
      this.audio.load();
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.isLoading.set(false);
          this.isPlaying.set(false);
          this.error.set('Playback was blocked or stream could not be decoded.');
        });
      }
    } catch (err: any) {
      this.isLoading.set(false);
      this.isPlaying.set(false);
      this.error.set(err?.message || 'Failed to start audio stream.');
    }
  }

  togglePlay(): void {
    if (!this.audio) return;
    if (this.isPlaying()) {
      this.audio.pause();
      this.isPlaying.set(false);
    } else {
      if (this.currentStation()) {
        this.audio.play().then(() => {
          this.isPlaying.set(true);
        }).catch(() => {
          if (this.currentStation()) {
            this.playStation(this.currentStation()!);
          }
        });
      } else {
        // Play first curated station
        this.playStation(CURATED_GLOBAL_STATIONS[0]);
      }
    }
  }

  pause(): void {
    if (this.audio && this.isPlaying()) {
      this.audio.pause();
      this.isPlaying.set(false);
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.currentStation.set(null);
    this.error.set(null);
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume.set(clamped);
    if (this.audio) {
      this.audio.volume = clamped;
      if (clamped > 0 && this.isMuted()) {
        this.isMuted.set(false);
      }
    }
  }

  toggleMute(): void {
    if (!this.audio) return;
    const next = !this.isMuted();
    this.isMuted.set(next);
    this.audio.muted = next;
  }

  toggleFavorite(station: RadioStation): void {
    const current = this.favorites();
    const exists = current.some(s => s.id === station.id || s.name === station.name);
    let updated: RadioStation[];
    if (exists) {
      updated = current.filter(s => s.id !== station.id && s.name !== station.name);
    } else {
      updated = [station, ...current];
    }
    this.favorites.set(updated);
    if (this.isBrowser) {
      try {
        localStorage.setItem('2piclock_radio_favorites', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save favorite', e);
      }
    }
  }

  isStationFavorite(station: RadioStation): boolean {
    return this.favorites().some(s => s.id === station.id || s.name === station.name);
  }

  private addToRecents(station: RadioStation): void {
    const list = this.recentStations().filter(s => s.id !== station.id);
    const updated = [station, ...list].slice(0, 12);
    this.recentStations.set(updated);
    if (this.isBrowser) {
      try {
        localStorage.setItem('2piclock_radio_recents', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save recent', e);
      }
    }
  }

  searchStations(params: StationSearchParams): void {
    this.isSearching.set(true);
    const q = (params.query || '').trim().toLowerCase();
    const country = (params.country || '').trim().toLowerCase();
    const tag = (params.tag || '').trim().toLowerCase();

    // Local filtering on curated list
    const filtered = CURATED_GLOBAL_STATIONS.filter(s => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q));
      const matchCountry = !country || s.country.toLowerCase().includes(country) || s.countryCode.toLowerCase() === country;
      const matchTag = !tag || s.tags.some(t => t.toLowerCase().includes(tag));
      return matchQ && matchCountry && matchTag;
    });

    // If query is broad, try querying Radio-Browser API mirror with fast timeout fallback
    if (this.isBrowser && q.length >= 3) {
      const apiUrl = `https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(q)}?limit=25&hidebroken=true&order=votes&reverse=true`;
      
      this.http.get<any[]>(apiUrl).subscribe({
        next: (apiData) => {
          this.isSearching.set(false);
          if (Array.isArray(apiData) && apiData.length > 0) {
            const mapped: RadioStation[] = apiData
              .filter(s => s.url_resolved || s.url)
              .map(s => {
                // Determine approximate coords or fallback to preset location
                const matchedPreset = PRESET_LOCATIONS.find(p => 
                  p.country.toLowerCase() === (s.country || '').toLowerCase() || 
                  p.name.toLowerCase() === (s.state || '').toLowerCase()
                ) || PRESET_LOCATIONS[0];

                return {
                  id: s.stationuuid || `station-${Math.random()}`,
                  stationuuid: s.stationuuid,
                  name: s.name,
                  url: s.url_resolved || s.url,
                  urlResolved: s.url_resolved,
                  homepage: s.homepage,
                  favicon: s.favicon,
                  country: s.country || 'Global',
                  countryCode: s.countrycode || '🌐',
                  state: s.state,
                  city: s.state || matchedPreset.name,
                  language: s.language,
                  tags: (s.tags || '').split(',').map((t: string) => t.trim()).filter((t: string) => !!t),
                  votes: s.votes || 0,
                  clickCount: s.clickcount || 0,
                  codec: s.codec,
                  bitrate: s.bitrate,
                  latitude: matchedPreset.latitude,
                  longitude: matchedPreset.longitude,
                  timezone: matchedPreset.timezone
                };
              });

            // Combine with curated
            const combined = [...filtered, ...mapped];
            const deduped = combined.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
            this.searchResults.set(deduped);
          } else {
            this.searchResults.set(filtered);
          }
        },
        error: () => {
          this.isSearching.set(false);
          this.searchResults.set(filtered);
        }
      });
    } else {
      this.isSearching.set(false);
      this.searchResults.set(filtered);
    }
  }

  getStationsForLocation(cityName: string, countryName?: string): RadioStation[] {
    const normCity = cityName.toLowerCase();
    const normCountry = (countryName || '').toLowerCase();
    return CURATED_GLOBAL_STATIONS.filter(s => 
      s.city.toLowerCase().includes(normCity) || 
      (normCountry && s.country.toLowerCase().includes(normCountry))
    );
  }
}
