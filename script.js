/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║              SoundAura - Main Script                  ║
 * ║  Emotion-driven music platform with dynamic playlist  ║
 * ╚═══════════════════════════════════════════════════════╝
 *
 * Sections:
 *  1. Constants & Configuration
 *  2. State Management
 *  3. LocalStorage Persistence
 *  4. Audio Engine (Web Audio API + Equalizer)
 *  5. Data Loading
 *  6. Playlist Logic
 *  7. Player Controls
 *  8. Playback Modes
 *  9. UI Rendering
 * 10. Explore Modal
 * 11. User Playlist System
 * 12. Toast System
 * 13. Event Listeners
 * 14. Service Worker Registration
 * 15. Init
 */

// ═══════════════════════════════════════════════════════════
// 1. CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════

/** GitHub username for raw audio storage */
const GITHUB_USER = 'itsnjedits';

// ═══════════════════════════════════════════════════════════
// 1b. SONG IDENTITY HELPER
// ═══════════════════════════════════════════════════════════

/**
 * Unique identifier for a song — uses store + file as a stable key.
 * Never changes regardless of playlist position.
 */
function songId(song) {
  if (!song || !song.store || !song.file) return '';
  return `${song.store}::${song.file}`;
}

/**
 * Normalise the artist field to always be an array of strings.
 * Handles: string, array, undefined/null.
 * Called on every song at load time to prevent .some() crashes everywhere.
 */
function normaliseArtists(song) {
  if (!song) return song;
  if (!song.artist) {
    song.artist = [];
  } else if (typeof song.artist === 'string') {
    song.artist = song.artist.split(',').map(a => a.trim()).filter(Boolean);
  } else if (!Array.isArray(song.artist)) {
    song.artist = [String(song.artist)];
  }
  return song;
}

/**
 * Build audio URL — guards against prefix issues.
 * songs.json `file` field may be "Song.mp3", "audio/Song.mp3", or "Audio/Song.mp3".
 * Always produces: .../main/audio/Song.mp3  (lowercase)
 */
const AUDIO_URL = (store, file) => {
  if (!store || !file) return '';
  // Normalise: strip any existing audio/ or Audio/ prefix, re-attach lowercase
  const bare = file.replace(/^[Aa]udio\//, '');
  return encodeURI(`https://raw.githubusercontent.com/${GITHUB_USER}/${store}/main/audio/${bare}`);
};

const MOODS = [
  { id: 'sad', label: 'Sad', emoji: '😢', color: '#4b6b8a' },          // muted deep blue (night + loneliness)
  { id: 'ghazal', label: 'Ghazal', emoji: '🌙', color: '#7c5a4f' },    // warm brown + mehfil vibe
  { id: 'happy', label: 'Happy', emoji: '😊', color: '#e6b85c' },      // soft golden sunlight
  { id: 'romantic', label: 'Romantic', emoji: '❤️', color: '#d16a7a' },// warm pink (not neon)
  { id: 'party', label: 'Party', emoji: '🎉', color: '#a855f7' },      // vibrant purple (lights vibe)

  { id: 'punjabi', label: 'Punjabi', emoji: '🥁', color: '#22c55e' },  // energetic green
  { id: 'motivational', label: 'Motivational', emoji: '🔥', color: '#f97316' }, // strong orange sunrise
  { id: 'instrumental', label: 'Instrumental', emoji: '🎸', color: '#8b9dc3' }, // calm bluish grey (piano tone)
  { id: 'slowedreverb', label: 'Slowed & Reverb', emoji: '🌊', color: '#3ba7a0' }, // aqua dreamy
  { id: 'oldisgold', label: 'Old is Gold', emoji: '🌟', color: '#c89b3c' }, // vintage gold

  { id: 'meditation', label: 'Meditation', emoji: '🧘', color: '#b7c7a3' }, // soft earthy green
  { id: 'rain', label: 'Rain', emoji: '🌧️', color: '#6b7c8f' },       // misty grey-blue
  { id: 'vocalsonly', label: 'Vocals Only', emoji: '🎤', color: '#9d7ad6' }, // soft stage purple
  { id: 'spiritual', label: 'Spiritual', emoji: '✨', color: '#e0b84f' }, // divine golden glow
  { id: 'nostalgia', label: 'Nostalgia', emoji: '📷', color: '#a67c52' }, // sepia tone
];

const SINGERS = [
  'Akhil Sachdeva','Alka Yagnik','Amit Trivedi','Ankit Tiwari','AP Dhillon',
  'AR Rahman','Arijit Singh','Arko','Armaan Malik','Asha Bhosle','Atif Aslam',
  'Ayushmann Khurrana','B Praak','Bhupinder Singh','Chandan Daas','Gajendra Verma',
  'Ghulam Ali','Himesh Reshammiya','Jagjit Singh','Javed Ali','Javed Bashir',
  'Jubin Nautiyal','Kailash Kher','Kishore Kumar','KK','Kumar Sanu',
  'Lata Mangeshkar','Mehdi Hasan','Mohammed Irfan','Mohammed Rafi','Mohit Chauhan',
  'Monali Thakur','Mukesh','Nusrat Fateh Ali Khan','Palak Muchhal','Papon',
  'Rahat Fateh Ali Khan','Raj Barman','Roopkumar Rathod','Shaan','Shabbir Kumar',
  'Shafaqat Amanat Ali','Shankar Mahadevan','Shreya Ghoshal','Sonu Nigam',
  'Sukhwinder Singh','Udit Narayan','Vishal Dadlani'
];

const PLAYBACK_MODES = ['repeat', 'shuffle', 'loop', 'none'];

// ═══════════════════════════════════════════════════════════
// 1c. THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════

const THEMES = {
  'ocean-blue': {
    name: 'Ocean Blue',
    emoji: '🌊',
    accent: '#06b6d4',
    accent2: '#3b82f6',
    rgb: '6, 182, 212',
    swatch: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  'mystical-purple': {
    name: 'Mystical Purple',
    emoji: '🔮',
    accent: '#a855f7',
    accent2: '#7c3aed',
    rgb: '168, 85, 247',
    swatch: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  },
  'romantic-pink': {
    name: 'Romantic Pink',
    emoji: '🌸',
    accent: '#ec4899',
    accent2: '#db2777',
    rgb: '236, 72, 153',
    swatch: 'linear-gradient(135deg, #ec4899, #db2777)',
  },
  'emerald-dream': {
    name: 'Emerald Dream',
    emoji: '🌿',
    accent: '#10b981',
    accent2: '#059669',
    rgb: '16, 185, 129',
    swatch: 'linear-gradient(135deg, #10b981, #059669)',
  },
  'solar-gold': {
    name: 'Solar Gold',
    emoji: '☀️',
    accent: '#f59e0b',
    accent2: '#d97706',
    rgb: '245, 158, 11',
    swatch: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  'crimson-night': {
    name: 'Crimson Night',
    emoji: '🔴',
    accent: '#ef4444',
    accent2: '#dc2626',
    rgb: '239, 68, 68',
    swatch: 'linear-gradient(135deg, #ef4444, #dc2626)',
  },
  'midnight-shadow': {
    name: 'Midnight Shadow',
    emoji: '🌌',
    accent: '#6366f1',
    accent2: '#4f46e5',
    rgb: '99, 102, 241',
    swatch: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  },
};
const MODE_ICONS = {
  repeat: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  shuffle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
  loop: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="10" y="13" font-size="8" fill="currentColor" stroke="none">1</text></svg>`,
  /* "Play Once" = repeat icon with a diagonal slash across it — clearly means "no repeat" */
  none: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2.5"/></svg>`,
};
const MODE_LABELS = { repeat: 'Repeat Playlist', shuffle: 'Shuffle', loop: 'Loop One', none: 'Play Once' };

// EQ Frequencies — exact 10-band specification
const EQ_BANDS = [
  { freq: 31,    label: '31' },
  { freq: 62,    label: '62' },
  { freq: 125,   label: '125' },
  { freq: 250,   label: '250' },
  { freq: 500,   label: '500' },
  { freq: 1000,  label: '1k' },
  { freq: 2000,  label: '2k' },
  { freq: 4000,  label: '4k' },
  { freq: 8000,  label: '8k' },
  { freq: 16000, label: '16k' },
];

// ═══════════════════════════════════════════════════════════
// 2. STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const state = {
  allSongs: [],              // Full song library from JSON
  currentPlaylist: [],       // Songs shown in main list
  userPlaylists: {},         // { name: [songs] }
  activePlaylistName: null,  // Which user playlist is active

  currentSongIndex: -1,      // Cached index — always derived from currentSongId
  currentSongId: null,       // ← SOURCE OF TRUTH: stable ID of playing song
  isPlaying: false,
  playbackMode: 'repeat',    // repeat | shuffle | loop | none
  shuffleQueue: [],          // Remaining songs for shuffle mode
  shufflePlayed: [],         // Already played in this shuffle round

  currentFilter: null,       // { type: 'mood'|'singer', value: string }
  isDarkMode: true,
  volume: 1.0,               // 0.0 – 1.0
  isMuted: false,            // mute toggle

  favorites: new Set(),      // Set of songId strings

  // Settings
  currentTheme: 'ocean-blue',
  particlesOn: true,

  // "Add Songs" selection mode
  addSongsMode: false,
  selectionPool: [],
  selectedSongs: new Set(),  // audio URLs of selected songs

  // Audio
  audioContext: null,
  analyser: null,
  eqFilters: [],
  pitchNode: null,
  currentSource: null,
  gainNode: null,

  // Preload
  nextAudio: null,
  dragSrcIndex: null,

  visualizerFrame: null,
  _mobileVisFrame: null,
};

// ═══════════════════════════════════════════════════════════
// 2b. REQUEST MANAGER — cancels stale audio loads instantly
// ═══════════════════════════════════════════════════════════

/**
 * Monotonically-increasing token system.
 * Every call to loadAndPlay() calls RequestManager.next() which
 * increments _currentId.  Callbacks check isCurrent(id) before
 * touching state — if the id is stale it means a newer request
 * superseded this one, so we bail out silently.
 *
 * This guarantees: only the LAST request ever wins.
 * All previous requests become no-ops the instant the next one starts.
 */
const RequestManager = {
  _currentId: 0,

  /** Issue a new token — invalidates ALL previous tokens instantly */
  next() {
    return ++this._currentId;
  },

  /** Returns true only if this token is still the latest */
  isCurrent(id) {
    return id === this._currentId;
  },

  /** Externally cancel any pending load (e.g. on stop) */
  cancel() {
    this._currentId++;
  }
};

// ═══════════════════════════════════════════════════════════
// 2c. NAV THROTTLE — prevents next/prev flooding
// ═══════════════════════════════════════════════════════════

/**
 * Shared throttle for next / prev / random.
 * Different from RequestManager: this prevents the UI calls
 * (highlight, scroll) from also stacking — RequestManager
 * handles the async load race; this handles the sync UI race.
 * 250 ms is enough to feel instant but stop button-mashing storms.
 */
const NavThrottle = (() => {
  let _last = 0;
  return {
    ok(minMs = 250) {
      const now = Date.now();
      if (now - _last < minMs) return false;
      _last = now;
      return true;
    },
    reset() { _last = 0; }
  };
})();

// ═══════════════════════════════════════════════════════════
// 3. LOCAL STORAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════

const Storage = {
  save(key, value) {
    try { localStorage.setItem(`soundaura_${key}`, JSON.stringify(value)); } catch (e) {}
  },
  load(key, fallback = null) {
    try {
      const v = localStorage.getItem(`soundaura_${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  saveAll() {
    Storage.save('playlists', state.userPlaylists);
    Storage.save('playbackMode', state.playbackMode);
    Storage.save('darkMode', state.isDarkMode);
    Storage.save('volume', state.volume);
    Storage.save('muted', state.isMuted);
    if (state.eqFilters.length) {
      Storage.save('eqSettings', state.eqFilters.map(f => f.gain.value));
    }
    if (state.currentSongIndex >= 0) {
      const song = state.currentPlaylist[state.currentSongIndex];
      if (song) {
        // Persist last song + seek position + context (mood/singer/playlist)
        Storage.save('lastSong', {
          file: song.file,
          store: song.store,
          timestamp: audioEl.currentTime,
        });
        Storage.save('lastContext', {
          type: state.activePlaylistName
            ? 'playlist'
            : state.currentFilter
              ? state.currentFilter.type
              : 'all',
          value: state.activePlaylistName || state.currentFilter?.value || null,
        });
      }
    }
  },

  loadAll() {
    state.userPlaylists  = Storage.load('playlists', {});
    state.playbackMode   = Storage.load('playbackMode', 'repeat');
    state.isDarkMode     = Storage.load('darkMode', true);
    state.volume         = Storage.load('volume', 1.0);
    state.isMuted        = Storage.load('muted', false);
    // Restore favorites as a Set of songId strings
    state.favorites = new Set(Storage.load('favorites', []));
    // Load settings (theme, particles)
    const settings = Storage.load('settings', {});
    state.currentTheme   = settings.theme     || 'ocean-blue';
    state.particlesOn    = settings.particles !== undefined ? settings.particles : true;
  },

  /**
   * Restore the user's last context (mood / singer / playlist / all songs)
   * and then seek to the last played position.
   * Called after songs are loaded.
   */
  restoreContext() {
    const ctx  = Storage.load('lastContext', null);
    const last = Storage.load('lastSong', null);

    // ── Restore playlist context ──────────────────────────
    if (ctx) {
      if (ctx.type === 'favorites') {
        // Defer favorites view until after songs are loaded
        Favorites.openView();
      } else if (ctx.type === 'playlist' && ctx.value && state.userPlaylists[ctx.value]) {
        state.activePlaylistName = ctx.value;
        Playlist.set(state.userPlaylists[ctx.value], null);
      } else if (ctx.type === 'mood' && ctx.value) {
        const songs = DataLoader.filterByMood(
          MOODS.find(m => m.label === ctx.value || m.id === ctx.value)?.id || ctx.value
        );
        Playlist.set(songs, { type: 'mood', value: ctx.value });
      } else if (ctx.type === 'singer' && ctx.value) {
        const songs = DataLoader.filterByArtist(ctx.value);
        Playlist.set(songs, { type: 'singer', value: ctx.value });
      } else {
        Playlist.loadAll();
      }
    } else {
      Playlist.loadAll(); // first-time visitor
    }

    // ── Restore last song position (do NOT auto-play) ────
    if (last?.file && last?.store) {
      const idx = state.currentPlaylist.findIndex(
        s => s.file === last.file && s.store === last.store
      );
      if (idx !== -1) {
        state.currentSongIndex = idx;
        const song = state.currentPlaylist[idx];
        state.currentSongId = songId(song);      // ← restore stable ID
        audioEl.src = DataLoader.getAudioUrl(song);
        audioEl.load();
        audioEl.addEventListener('loadedmetadata', () => {
          if (last.timestamp > 0) audioEl.currentTime = last.timestamp;
        }, { once: true });
        UI.updatePlayerUI(song);
        UI.highlightCurrentSong();
        console.log('[Resume] Restored:', song.title, 'at', formatTime(last.timestamp ?? 0));
      }
    }
  },

  /** Save/load/delete custom EQ presets */
  saveCustomPreset(name, values) {
    const presets = Storage.load('customPresets', {});
    presets[name] = values;
    Storage.save('customPresets', presets);
  },
  loadCustomPresets() {
    return Storage.load('customPresets', {});
  },
  deleteCustomPreset(name) {
    const presets = Storage.load('customPresets', {});
    delete presets[name];
    Storage.save('customPresets', presets);
  }
};

// ═══════════════════════════════════════════════════════════
// 4. AUDIO ENGINE
// ═══════════════════════════════════════════════════════════

/** Primary <audio> element — gapless via preload */
const audioEl = new Audio();
audioEl.crossOrigin = 'anonymous';
audioEl.preload = 'auto';
// Expose for AtmosphereEngine expand player progress sync
window._soundAuraAudio = audioEl;

// Error handler — logs to FailureLog and surfaces in UI
audioEl.onerror = () => {
  const song = state.currentSongIndex >= 0 ? state.currentPlaylist[state.currentSongIndex] : null;

  // ── [FIX P-1] Stale-load guard ───────────────────────────────
  // When loadAndPlay() is called rapidly, the browser aborts the
  // previous in-flight request.  onerror can fire for that OLD,
  // now-irrelevant load.  We compare audioEl.src (which by this
  // point already holds the NEW url) against what the CURRENT song
  // expects.  A mismatch means this error belongs to an aborted
  // load — silently ignore it so no false "Load Failed" appears.
  const intendedUrl = song ? DataLoader.getAudioUrl(song) : '';
  if (intendedUrl && audioEl.src !== intendedUrl) {
    console.warn('[Player] Stale onerror suppressed — belongs to an aborted load');
    return;
  }

  const reason = audioEl.error ? `MediaError code ${audioEl.error.code}` : 'Unknown error';
  console.error('[Player] Audio failed to load:', audioEl.src, reason);
  FailureLog.add(song, reason);
  LoadingToast.error();
  Toast.show('⚠️ Song failed to load — skipping', 'error');
  setTimeout(() => Player.next(), 800);
};

const AudioEngine = {
  /** Initialize Web Audio API context + EQ chain */
  init() {
    if (state.audioContext) return;
    try {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audioContext;

      const source = ctx.createMediaElementSource(audioEl);
      state.analyser = ctx.createAnalyser();
      state.analyser.fftSize = 256;
      state.gainNode = ctx.createGain();

      // Build EQ filter chain
      state.eqFilters = EQ_BANDS.map((band, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = band.freq;
        filter.gain.value = Storage.load('eqSettings', null)?.[i] ?? 0;
        filter.Q.value = 1;
        return filter;
      });

      // Chain: source → EQ → analyser → gain → destination
      let chain = source;
      state.eqFilters.forEach(f => { chain.connect(f); chain = f; });
      chain.connect(state.analyser);
      state.analyser.connect(state.gainNode);
      state.gainNode.connect(ctx.destination);

      console.log('[Audio] Web Audio API initialized');
      AudioEngine._bindVisibilityResume();
    } catch (e) {
      console.warn('[Audio] Web Audio API unavailable:', e);
    }
  },

  /** Resume context after user gesture */
  resume() {
    if (state.audioContext?.state === 'suspended') {
      state.audioContext.resume().catch(() => {});
    }
  },

  /** Resume context whenever the page becomes visible again (screen unlock, tab switch) */
  _bindVisibilityResume() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.isPlaying) {
        AudioEngine.resume();
        // Some mobile browsers suspend the audio element itself — restart it
        if (audioEl.paused && state.isPlaying) {
          audioEl.play().catch(() => {});
        }
      }
    });
    // Page Lifecycle API: fires on freeze/resume (battery-saver, etc.)
    document.addEventListener('resume', () => { AudioEngine.resume(); });
    window.addEventListener('focus', () => {
      if (state.isPlaying) AudioEngine.resume();
    });
  },

  /** Set EQ band gain (-12 to +12 dB) */
  setEQBand(index, value) {
    if (state.eqFilters[index]) {
      state.eqFilters[index].gain.value = value;
      Storage.save('eqSettings', state.eqFilters.map(f => f.gain.value));
    }
  },

  /** Save current EQ values as a named custom preset */
  saveCurrentPreset(name) {
    if (!name || !name.trim()) return;
    const values = state.eqFilters.length
      ? state.eqFilters.map(f => f.gain.value)
      : EQ_BANDS.map((_, i) => {
          const slider = document.getElementById(`eq-band-${i}`);
          return slider ? parseFloat(slider.value) : 0;
        });
    Storage.saveCustomPreset(name.trim(), values);
    Toast.show(`✓ Preset "${name}" saved`, 'success');
    EQPanel.renderCustomPresets();
  },

  /** Apply a preset by values array */
  applyPreset(values) {
    values.forEach((val, i) => {
      AudioEngine.setEQBand(i, val);
      const slider = document.getElementById(`eq-band-${i}`);
      if (slider) {
        slider.value = val;
        slider.parentElement.querySelector('.eq-value').textContent = val;
      }
    });
  },

  /** Reset EQ to flat */
  resetEQ() {
    state.eqFilters.forEach((f, i) => {
      f.gain.value = 0;
      const slider = document.getElementById(`eq-band-${i}`);
      if (slider) { slider.value = 0; slider.parentElement.querySelector('.eq-value').textContent = '0'; }
    });
    Storage.save('eqSettings', new Array(EQ_BANDS.length).fill(0));
  },

  /** Start canvas visualizer */
  startVisualizer() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas || !state.analyser) return;
    const ctx = canvas.getContext('2d');
    const bufLen = state.analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);
    const smoothed = new Float32Array(bufLen);

    const getThemeColors = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        c1: cs.getPropertyValue('--theme-accent').trim() || '#06b6d4',
        c2: cs.getPropertyValue('--theme-accent2').trim() || '#3b82f6',
        rgb: cs.getPropertyValue('--theme-accent-rgb').trim() || '6,182,212',
      };
    };

    const draw = () => {
      state.visualizerFrame = requestAnimationFrame(draw);
      state.analyser.getByteFrequencyData(dataArr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { c1, c2, rgb } = getThemeColors();
      const BARS = Math.min(bufLen, 48);
      const barW = canvas.width / BARS;
      const gap = barW > 4 ? 1.5 : 0.8;

      for (let i = 0; i < BARS; i++) {
        const idx = Math.floor((i / BARS) * bufLen * 0.6);
        smoothed[i] = smoothed[i] * 0.78 + (dataArr[idx] / 255) * 0.22;
        const barH = smoothed[i] * canvas.height;
        if (barH < 0.5) continue;
        const gradient = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
        gradient.addColorStop(0, c1);
        gradient.addColorStop(1, c2);
        ctx.fillStyle = gradient;
        const x = i * barW;
        const w = barW - gap;
        const radius = Math.min(w / 2, 2.5);
        ctx.beginPath();
        ctx.moveTo(x + radius, canvas.height - barH);
        ctx.arcTo(x + w, canvas.height - barH, x + w, canvas.height, radius);
        ctx.arcTo(x + w, canvas.height, x, canvas.height, 0);
        ctx.arcTo(x, canvas.height, x, canvas.height - barH, 0);
        ctx.arcTo(x, canvas.height - barH, x + w, canvas.height - barH, radius);
        ctx.closePath();
        ctx.fill();
        // Soft glow on tall bars
        if (smoothed[i] > 0.5) {
          ctx.shadowColor = `rgba(${rgb},0.35)`;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };
    draw();
  },

  stopVisualizer() {
    if (state.visualizerFrame) {
      cancelAnimationFrame(state.visualizerFrame);
      state.visualizerFrame = null;
    }
    const canvas = document.getElementById('visualizer-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  },

  /** Draw visualizer bars on mobile drawer canvas (#visualizer-canvas-mobile).
   *  Uses the same analyser node — just a second draw target. */
  startMobileVisualizer() {
    const canvas = document.getElementById('visualizer-canvas-mobile');
    if (!canvas || !state.analyser) return;
    const ctx   = canvas.getContext('2d');
    const bufLen = state.analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);

    // Cancel any prior mobile vis loop
    if (state._mobileVisFrame) cancelAnimationFrame(state._mobileVisFrame);

    const draw = () => {
      // Stop when drawer is closed (canvas not visible)
      const drawer = document.getElementById('mobile-sidebar-drawer');
      if (!drawer || drawer.classList.contains('translate-x-full')) {
        state._mobileVisFrame = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      state._mobileVisFrame = requestAnimationFrame(draw);
      state.analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = (canvas.width / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (data[i] / 255) * canvas.height;
        const cs = getComputedStyle(document.documentElement);
        const c1 = cs.getPropertyValue('--theme-accent').trim() || '#06b6d4';
        const c2 = cs.getPropertyValue('--theme-accent2').trim() || '#3b82f6';
        const grad = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barH, barW - 1, barH);
        x += barW + 1;
      }
    };
    draw();
  }
};

// ═══════════════════════════════════════════════════════════
// 5. DATA LOADING
// ═══════════════════════════════════════════════════════════

const DataLoader = {
  /** Show skeleton placeholder while songs are loading */
  _showSkeleton() {
    const container = document.getElementById('song-list');
    if (!container) return;
    const skeletons = Array.from({ length: 8 }, () => `
      <div class="song-item flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent" style="pointer-events:none">
        <div class="w-12 h-12 rounded-lg flex-shrink-0 skeleton-shimmer" style="background:rgba(255,255,255,0.07);min-width:48px"></div>
        <div class="flex-1 min-w-0 space-y-2">
          <div class="h-3 rounded-full skeleton-shimmer" style="width:${55 + Math.floor(Math.random()*30)}%;background:rgba(255,255,255,0.07)"></div>
          <div class="h-2 rounded-full skeleton-shimmer" style="width:${30 + Math.floor(Math.random()*25)}%;background:rgba(255,255,255,0.05)"></div>
        </div>
      </div>`).join('');
    container.innerHTML = skeletons;
    console.log('[Data] Showing skeleton loading state');
  },

  async loadSongs() {
    DataLoader._showSkeleton();
    try {
      console.log('[Data] Fetching songs.json...');
      const res = await fetch('songs.json');
      if (!res.ok) throw new Error(`songs.json fetch failed: ${res.status}`);
      const raw = await res.json();
      // Normalise every song's artist field to Array<string> at load time.
      // This prevents .some() crashes everywhere in the app.
      state.allSongs = raw.map(normaliseArtists);
      console.log(`[Data] Loaded ${state.allSongs.length} songs`);
      return state.allSongs;
    } catch (e) {
      console.error('[Data] Error loading songs:', e);
      Toast.show('Could not load songs — check connection', 'error');
      return [];
    }
  },

  /** Filter songs by mood */
  filterByMood(mood) {
    return state.allSongs
      .filter(s => Array.isArray(s.mood) && s.mood.includes(mood))
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /** Filter songs by artist (partial match, safe after normalisation) */
  filterByArtist(artist) {
    const q = artist.toLowerCase();
    return state.allSongs
      .filter(s => Array.isArray(s.artist) && s.artist.some(a => a.toLowerCase().includes(q)))
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /** Get audio URL for a song */
  getAudioUrl(song) {
    if (!song?.store || !song?.file) return '';
    return AUDIO_URL(song.store, song.file);
  },

  /** Get thumbnail URL with fallback */
  getThumbnailUrl(song) {
    return song?.image || 'choice/default_thumb.jpg';
  }
};

// ═══════════════════════════════════════════════════════════
// 6. PLAYLIST LOGIC
// ═══════════════════════════════════════════════════════════

const Playlist = {
  /** Set a new playlist (replaces current) */
  set(songs, filterInfo = null) {
    state.currentPlaylist = songs;
    state.currentFilter = filterInfo;
    state.currentSongIndex = -1;
    state.shuffleQueue = [];
    state.shufflePlayed = [];
    UI.renderSongList();
    UI.updatePlaylistMeta();
    // Persist context so reload restores the same view
    if (filterInfo) {
      Storage.save('lastContext', { type: filterInfo.type, value: filterInfo.value });
    } else if (state.activePlaylistName) {
      Storage.save('lastContext', { type: 'playlist', value: state.activePlaylistName });
    } else {
      Storage.save('lastContext', { type: 'all', value: null });
    }
  },

  /** Load all songs as default */
  loadAll() {
    const sorted = [...state.allSongs].sort((a, b) => a.title.localeCompare(b.title));
    state.activePlaylistName = null;
    Playlist.set(sorted, null);
    Storage.save('lastContext', { type: 'all', value: null });
  },

  /** Play by index in current playlist — always sets currentSongId as source of truth */
  playAt(index, fromUserAction = true) {
    if (index < 0 || index >= state.currentPlaylist.length) return;

    // ── Instant visual feedback ─────────────────────────────
    state.currentSongIndex = index;
    const song = state.currentPlaylist[index];
    state.currentSongId = songId(song);

    // Immediate highlight + player UI update
    UI._instantHighlight(index);
    UI.updatePlayerUI(song);

    // Show loading toast immediately — user sees progress before audio starts
    if (fromUserAction) LoadingToast.show(song.title);

    Player.loadAndPlay(song, fromUserAction);
    Storage.saveAll();
  },

  /** Get next song index based on playback mode */
  getNextIndex() {
    const len = state.currentPlaylist.length;
    if (len === 0) return -1;

    switch (state.playbackMode) {
      case 'loop':
        return state.currentSongIndex;

      case 'shuffle': {
        // Replenish queue if empty
        if (state.shuffleQueue.length === 0) {
          state.shuffleQueue = [...Array(len).keys()]
            .filter(i => i !== state.currentSongIndex);
          // Fisher-Yates shuffle
          for (let i = state.shuffleQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.shuffleQueue[i], state.shuffleQueue[j]] = [state.shuffleQueue[j], state.shuffleQueue[i]];
          }
        }
        return state.shuffleQueue.shift();
      }

      case 'repeat':
        return (state.currentSongIndex + 1) % len;

      case 'none':
        return state.currentSongIndex + 1 < len ? state.currentSongIndex + 1 : -1;

      default:
        return (state.currentSongIndex + 1) % len;
    }
  },

  getPrevIndex() {
    const len = state.currentPlaylist.length;
    if (len === 0) return -1;
    return state.currentSongIndex <= 0 ? len - 1 : state.currentSongIndex - 1;
  },

  /** Pick a random song — select & highlight ONLY, do NOT autoplay.
   *  User must press Play manually. */
  playRandom() {
    if (!state.currentPlaylist.length) return;

    console.log('[RandomSong] Generate clicked');

    // Throttle rapid clicks for 650 ms (covers the 450 ms dice animation)
    if (Playlist._randomBusy) return;
    Playlist._randomBusy = true;
    setTimeout(() => { Playlist._randomBusy = false; }, 650);

    const idx = Math.floor(Math.random() * state.currentPlaylist.length);
    const song = state.currentPlaylist[idx];

    console.log('[RandomSong] Selected song:', song.title, '| index:', idx);

    // Clear any existing random animation first
    UI._clearRandomAnim();

    // Re-render the list to show the active highlight
    UI.renderSongList();

    // Scroll to song and apply persistent orbital animation
    UI.scrollToSong(idx);
    requestAnimationFrame(() => UI.applyRandomHighlight(idx));

    Toast.show(`🎲 ${song.title} — press ▶ to play`, 'info');
    Storage.saveAll();
  },

  // Throttle flag — shared with the dice button event handler
  _randomBusy: false
};

// ═══════════════════════════════════════════════════════════
// 7. PLAYER CONTROLS
// ═══════════════════════════════════════════════════════════

const Player = {
  /** Load a song into audio element and play.
   *
   * ── REQUEST CANCELLATION DESIGN ────────────────────────────
   * Each call issues a new RequestManager token BEFORE touching
   * the audio element.  The token from a previous call is
   * immediately invalidated — all its async callbacks become
   * no-ops.  This ensures:
   *   • Only the LAST click/keypress survives
   *   • Zero stale-response overwrites
   *   • Zero audio desync or double-play
   *   • No toast errors for aborted loads
   */
  loadAndPlay(song, autoplay = true) {
    // Issue new token — kills every previous pending load
    const reqId = RequestManager.next();

    // Clear random-selection animation when user explicitly plays
    UI._clearRandomAnim?.();

    const url = DataLoader.getAudioUrl(song);

    // Clean up any preloaded audio immediately
    if (state.nextAudio) {
      state.nextAudio.src = '';
      state.nextAudio = null;
    }

    // Stop and reset before loading new source
    audioEl.pause();
    audioEl.src = url;
    audioEl.load();

    // ── SPEED SYNC FIX ──────────────────────────────────────
    // Re-apply speed — Chrome/Safari reset it on src change.
    audioEl.playbackRate = SpeedControl.current;

    if (autoplay) {
      audioEl.play()
        .then(() => {
          // ── STALE GUARD ──────────────────────────────────
          // If a newer load started after us, this callback belongs
          // to a superseded request. Stop immediately — do NOT update
          // state, do NOT show toasts, do NOT start the visualizer.
          if (!RequestManager.isCurrent(reqId)) {
            console.info('[Player] Stale load resolved — discarding (reqId=%d)', reqId);
            return;
          }

          audioEl.playbackRate = SpeedControl.current;
          state.isPlaying = true;
          UI.setPlayPauseIcon(true);
          AudioEngine.resume();
          if (!state.audioContext) AudioEngine.init();
          AudioEngine.startVisualizer();
          // [Atmosphere] Hook analyser now that AudioEngine is live
          if (typeof AtmosphereEngine !== 'undefined' && state.analyser && !AtmosphereEngine.AudioReactive._analyser) {
            AtmosphereEngine.AudioReactive.init(state.analyser);
          }
          Player.preloadNext();
          MediaSession.update(song);
          LoadingToast.complete();
          setTimeout(() => UI.scrollToSong(state.currentSongIndex), 150);
          // [Atmosphere] Notify song change → extract palette, update effects
          if (typeof AtmosphereEngine !== 'undefined') {
            const playingSong = state.currentPlaylist[state.currentSongIndex];
            if (playingSong) AtmosphereEngine.onSongChange(playingSong);
          }
        })
        .catch(e => {
          // AbortError = browser killed this play() because src changed.
          // This is expected when rapidly switching songs — not an error.
          if (e && e.name === 'AbortError') {
            console.info('[Player] play() aborted by newer load (reqId=%d)', reqId);
            return;
          }
          // Only surface real errors for the current request
          if (!RequestManager.isCurrent(reqId)) return;
          console.warn('[Player] Playback blocked:', e);
          state.isPlaying = false;
          UI.setPlayPauseIcon(false);
          LoadingToast.error();
        });
    }
  },

  /** Toggle play / pause */
  togglePlay() {
    if (!state.currentPlaylist.length) return;
    console.log('[Player] Toggle play, isPlaying:', state.isPlaying);
    // First-time play: no song loaded yet → start from a random song for engagement
    if (state.currentSongIndex < 0) {
      const idx = Math.floor(Math.random() * state.currentPlaylist.length);
      Playlist.playAt(idx);
      return;
    }
    if (audioEl.paused) {
      audioEl.play().then(() => {
        state.isPlaying = true;
        UI.setPlayPauseIcon(true);
        AudioEngine.startVisualizer();
        // [Atmosphere] Signal play → start audio reactive
        if (typeof AtmosphereEngine !== 'undefined') AtmosphereEngine.onPlayStateChange(true);
      });
    } else {
      audioEl.pause();
      state.isPlaying = false;
      UI.setPlayPauseIcon(false);
      AudioEngine.stopVisualizer();
      // [Atmosphere] Signal pause
      if (typeof AtmosphereEngine !== 'undefined') AtmosphereEngine.onPlayStateChange(false);
    }
  },

  /** Skip forward/backward N seconds */
  skip(seconds) {
    audioEl.currentTime = Math.min(Math.max(0, audioEl.currentTime + seconds), audioEl.duration || 0);
  },

  /** Play next song — throttled to prevent request flooding */
  next() {
    console.log('[Player] Next song');
    // 200 ms minimum between next-clicks.
    // RequestManager already kills stale async callbacks; this
    // prevents the SYNCHRONOUS highlight + scroll storm too.
    if (!NavThrottle.ok(200)) return;
    const idx = Playlist.getNextIndex();
    if (idx === -1) {
      Player.stop();
      return;
    }
    Playlist.playAt(idx, true);
  },

  /** Play previous song — throttled */
  prev() {
    console.log('[Player] Previous song');
    if (!NavThrottle.ok(200)) return;
    // If >3 seconds in, restart current song
    if (audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      return;
    }
    Playlist.playAt(Playlist.getPrevIndex(), true);
  },

  stop() {
    RequestManager.cancel(); // kill any pending load
    audioEl.pause();
    audioEl.currentTime = 0;
    state.isPlaying = false;
    UI.setPlayPauseIcon(false);
    AudioEngine.stopVisualizer();
  },

  /** Set playback speed */
  setSpeed(rate) {
    audioEl.playbackRate = parseFloat(rate);
    const btn = document.getElementById('speed-btn');
    if (btn) btn.textContent = `${rate}x`;
  },

  /** Preload next song for near-gapless playback.
   *  Properly cleans up any previous preloaded element to avoid
   *  memory leaks and phantom network requests.
   */
  preloadNext() {
    const nextIdx = Playlist.getNextIndex();
    if (nextIdx === -1 || nextIdx === state.currentSongIndex) {
      // Nothing to preload; release any held element
      if (state.nextAudio) { state.nextAudio.src = ''; state.nextAudio = null; }
      return;
    }
    const nextSong = state.currentPlaylist[nextIdx];
    if (!nextSong) return;

    // Release previous preload element before creating a new one
    if (state.nextAudio) {
      state.nextAudio.src = '';
      state.nextAudio = null;
    }

    const next = new Audio();
    next.preload = 'metadata'; // 'metadata' only — avoids hogging bandwidth
    next.src = DataLoader.getAudioUrl(nextSong);
    state.nextAudio = next;
  }
};

// ═══════════════════════════════════════════════════════════
// 7b. VOLUME CONTROL
// ═══════════════════════════════════════════════════════════

const Volume = {
  /** Set volume 0–1, update slider + icon, persist */
  set(val) {
    state.volume = Math.max(0, Math.min(1, val));
    state.isMuted = state.volume === 0;
    audioEl.volume = state.volume;
    Volume.updateUI();
    Storage.save('volume', state.volume);
    Storage.save('muted', state.isMuted);
  },

  /** Toggle mute / unmute */
  toggleMute() {
    if (state.isMuted) {
      state.isMuted = false;
      audioEl.volume = state.volume || 0.7;
      if (state.volume === 0) state.volume = 0.7;
    } else {
      state.isMuted = true;
      audioEl.volume = 0;
    }
    Volume.updateUI();
    Storage.save('muted', state.isMuted);
  },

  /** Sync slider + icon to current state, including filled-track CSS */
  updateUI() {
    const slider = document.getElementById('volume-slider');
    const icon   = document.getElementById('volume-icon');
    const vol    = state.isMuted ? 0 : state.volume;
    if (slider) {
      slider.value = vol;
      // Dynamic filled-track: left side cyan, right side gray
      const pct = vol * 100;
      slider.style.background =
        `linear-gradient(to right, var(--theme-accent) ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
    }
    if (icon) icon.innerHTML = Volume.iconSVG(vol);
  },

  iconSVG(vol) {
    if (vol === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    if (vol < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  },

  /** Restore volume from state on page load */
  restore() {
    audioEl.volume = state.isMuted ? 0 : state.volume;
    Volume.updateUI();
  }
};

// ═══════════════════════════════════════════════════════════
// 7c. MEDIA SESSION API (lock-screen / notification controls)
// ═══════════════════════════════════════════════════════════

const MediaSession = {
  update(song) {
    if (!('mediaSession' in navigator)) return;
    const artists = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title:  song.title,
      artist: artists,
      album:  'SoundAura',
      artwork: [{ src: DataLoader.getThumbnailUrl(song), sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play',          () => Player.togglePlay());
    navigator.mediaSession.setActionHandler('pause',         () => Player.togglePlay());
    navigator.mediaSession.setActionHandler('nexttrack',     () => Player.next());
    navigator.mediaSession.setActionHandler('previoustrack', () => Player.prev());
    navigator.mediaSession.setActionHandler('seekbackward',  () => Player.skip(-10));
    navigator.mediaSession.setActionHandler('seekforward',   () => Player.skip(10));
    console.log('[MediaSession] Updated:', song.title);
  }
};

// ═══════════════════════════════════════════════════════════
// 7d. SONG CARD MODAL
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 7e. PLAYBACK SPEED CONTROL — modal popup, preset buttons, custom slider
// ═══════════════════════════════════════════════════════════

const SpeedControl = {
  current: 1.0,

  /**
   * Set playback rate, persist, update all UI surfaces:
   * – all .speed-display spans (player bars)
   * – speed modal live display + slider fill + active preset highlight
   */
  set(rate) {
    rate = Math.max(0.25, Math.min(2, Math.round(parseFloat(rate) * 20) / 20)); // snap to 0.05
    SpeedControl.current = rate;
    audioEl.playbackRate = rate;

    const label = Number.isInteger(rate) ? `${rate}×` : `${rate.toFixed(2)}×`;

    // Update all navbar/player bar speed labels
    document.querySelectorAll('.speed-display').forEach(el => { el.textContent = label; });

    // Update modal elements if open
    const modalCurrent = document.getElementById('speed-modal-current');
    const modalSlider  = document.getElementById('speed-modal-slider');
    if (modalCurrent) modalCurrent.textContent = label;
    if (modalSlider) {
      modalSlider.value = rate;
      SpeedControl._fillSlider(modalSlider);
    }
    // Highlight active preset button
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
      const r = parseFloat(btn.dataset.rate);
      btn.classList.toggle('active-speed', Math.abs(r - rate) < 0.001);
    });

    Storage.save('playbackSpeed', rate);
  },

  /** Fill the modal slider track cyan on the left, gray on the right */
  _fillSlider(slider) {
    const min = parseFloat(slider.min), max = parseFloat(slider.max);
    const pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
    slider.style.background =
      `linear-gradient(to right, var(--theme-accent) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`;
  },

  restore() {
    SpeedControl.set(Storage.load('playbackSpeed', 1.0));
  },

  /** Open the speed selection modal */
  openModal() {
    const modal = document.getElementById('speed-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // Sync slider + display to current rate
    const slider = document.getElementById('speed-modal-slider');
    if (slider) {
      slider.value = SpeedControl.current;
      SpeedControl._fillSlider(slider);
    }
    SpeedControl.set(SpeedControl.current); // re-applies highlights
    // Close on backdrop click
    modal._closeHandler = (e) => { if (e.target === modal) SpeedControl.closeModal(); };
    modal.addEventListener('click', modal._closeHandler);
    // Close on Escape
    modal._escHandler = (e) => { if (e.key === 'Escape') SpeedControl.closeModal(); };
    document.addEventListener('keydown', modal._escHandler);
  },

  closeModal() {
    const modal = document.getElementById('speed-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    if (modal._closeHandler) modal.removeEventListener('click', modal._closeHandler);
    if (modal._escHandler)   document.removeEventListener('keydown', modal._escHandler);
  }
};

// ═══════════════════════════════════════════════════════════
// 7f. PWA INSTALL PROMPT
// ═══════════════════════════════════════════════════════════

const PWAInstall = {
  _deferredPrompt: null,

  init() {
    // Capture the browser's install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      PWAInstall._deferredPrompt = e;
      // Show our custom banner after a short delay
      setTimeout(() => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.remove('hidden');
      }, 3000);
    });

    // Hide banner if already installed
    window.addEventListener('appinstalled', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('hidden');
      PWAInstall._deferredPrompt = null;
      console.log('[PWA] App installed');
    });
  },

  async install() {
    if (!PWAInstall._deferredPrompt) return;
    PWAInstall._deferredPrompt.prompt();
    const { outcome } = await PWAInstall._deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    PWAInstall._deferredPrompt = null;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('hidden');
  },

  dismiss() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('hidden');
    // Don't show again this session
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  }
};

// ─── Audio Event Listeners ───────────────────────────────
let _savePositionTimer = null;

audioEl.addEventListener('timeupdate', () => {
  const { currentTime, duration } = audioEl;
  if (!duration) return;
  const pct = (currentTime / duration) * 100;

  // Update both mobile and desktop progress bars
  [['progress-filled','time-current','time-total'],
   ['progress-filled-desktop','time-current-desktop','time-total-desktop']].forEach(([fillId, curId, totId]) => {
    const filled = document.getElementById(fillId);
    const cur    = document.getElementById(curId);
    const tot    = document.getElementById(totId);
    if (filled) filled.style.width = `${pct}%`;
    if (cur)    cur.textContent = formatTime(currentTime);
    if (tot)    tot.textContent = formatTime(duration);
  });

  // Mobile progress thumb
  const mThumb = document.getElementById('progress-thumb');
  if (mThumb) mThumb.style.left = `${pct}%`;
  const dThumb = document.getElementById('progress-thumb-desktop');
  if (dThumb) dThumb.style.left = `${pct}%`;

  // [Performance] Mini/Popup player removed

  // Throttle-save position every 5 s
  if (!_savePositionTimer) {
    _savePositionTimer = setTimeout(() => {
      _savePositionTimer = null;
      if (state.currentSongIndex >= 0) {
        const song = state.currentPlaylist[state.currentSongIndex];
        if (song) Storage.save('lastSong', { file: song.file, store: song.store, timestamp: audioEl.currentTime });
      }
    }, 5000);
  }
});

audioEl.addEventListener('ended', () => {
  // In "Play Once" mode, stop completely — do NOT advance to next song
  if (state.playbackMode === 'none') {
    Player.stop();
    return;
  }
  Player.next();
});

audioEl.addEventListener('loadedmetadata', () => {
  const t = formatTime(audioEl.duration);
  ['time-total', 'time-total-desktop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  });
});

// ═══════════════════════════════════════════════════════════
// 8. PLAYBACK MODES
// ═══════════════════════════════════════════════════════════

const PlaybackMode = {
  cycle() {
    const cur = PLAYBACK_MODES.indexOf(state.playbackMode);
    state.playbackMode = PLAYBACK_MODES[(cur + 1) % PLAYBACK_MODES.length];
    console.log('[Player] Playback mode changed to:', state.playbackMode);
    PlaybackMode.updateUI();
    Toast.show(`Mode: ${MODE_LABELS[state.playbackMode]}`, 'info');
    Storage.save('playbackMode', state.playbackMode);
  },

  updateUI() {
    ['mode-btn', 'mode-btn-desktop'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.innerHTML = MODE_ICONS[state.playbackMode];
      btn.title = MODE_LABELS[state.playbackMode];
      btn.style.color = state.playbackMode !== 'none' ? 'var(--theme-accent)' : '';
      btn.classList.toggle('text-gray-500', state.playbackMode === 'none');
    });
    // [Performance] Mini/Popup player removed
  }
};

// ═══════════════════════════════════════════════════════════
// 9. UI RENDERING
// ═══════════════════════════════════════════════════════════

const UI = {
  /** Render the song list in #song-list */
  renderSongList(songs = state.currentPlaylist) {
    const container = document.getElementById('song-list');
    if (!container) return;

    if (!songs.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-gray-500">
          <div class="text-5xl mb-4">🎵</div>
          <p class="text-lg">No songs found</p>
          <p class="text-sm mt-1">Try a different mood or artist</p>
        </div>`;
      return;
    }

    // inUserPlaylist = true only for REAL user playlists, NOT the synthetic __favorites__ view.
    // Reason: __favorites__ is not stored in state.userPlaylists, so UserPlaylists.removeSong
    // silently fails on it. Favorites are managed exclusively via the heart (fav-btn) toggle.
    const inUserPlaylist = state.activePlaylistName !== null &&
                           state.activePlaylistName !== '__favorites__';
    const isFiltered = songs !== state.currentPlaylist;

    container.innerHTML = songs.map((song, i) => {
      // Resolve original currentPlaylist index for playback
      const playlistIdx = isFiltered ? state.currentPlaylist.indexOf(song) : i;
      // ── Highlight by ID, not by index ──
      const id = songId(song);
      const isActive = id === state.currentSongId;
      const isFav    = state.favorites.has(id);
      const artists  = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
      const thumbUrl = DataLoader.getThumbnailUrl(song);
      const audioUrl = DataLoader.getAudioUrl(song);

      return `
        <div
          class="song-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
            ${isActive ? 'active-song border' : 'hover:bg-white/5 border border-transparent'}"
          data-index="${playlistIdx}"
          data-song-id="${id}"
          ${inUserPlaylist ? `data-drag-index="${i}"` : ''}
        >
          ${inUserPlaylist ? `<div class="drag-handle text-gray-600 cursor-grab mr-1 flex-shrink-0" data-drag-index="${i}">⠿</div>` : ''}
          <div class="relative flex-shrink-0">
            <img
              src="${thumbUrl}"
              alt="${song.title}"
              class="w-12 h-12 rounded-lg object-cover bg-gray-800"
              onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 48 48%22><rect width=%2248%22 height=%2248%22 fill=%22%23374151%22 rx=%228%22/><text x=%2224%22 y=%2230%22 text-anchor=%22middle%22 font-size=%2220%22>🎵</text></svg>'"
              loading="lazy"
            />
            ${isActive && state.isPlaying ? `
              <div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div class="playing-bars flex gap-0.5 items-end h-4">
                  <span class="bar w-1 rounded-full animate-bounce" style="height:60%;animation-delay:0s;background:var(--theme-accent)"></span>
                  <span class="bar w-1 rounded-full animate-bounce" style="height:100%;animation-delay:0.15s;background:var(--theme-accent)"></span>
                  <span class="bar w-1 rounded-full animate-bounce" style="height:70%;animation-delay:0.3s;background:var(--theme-accent)"></span>
                </div>
              </div>` : ''}
          </div>
          <div class="flex-1 min-w-0">
            <p class="song-title font-medium text-sm truncate ${isActive ? '' : 'text-white'}" style="${isActive ? 'color:var(--theme-accent)' : ''}">${song.title}</p>
            <p class="text-xs text-gray-400 truncate mt-0.5">${artists}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Heart / Favorite button — always shown; toggle adds OR removes -->
            <button class="fav-btn w-7 h-7 flex items-center justify-center rounded-full transition-all
              ${isFav ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20' : 'text-gray-500 hover:text-rose-400 hover:bg-white/5'}"
              data-song-id="${id}"
              data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}'
              title="Favorite"
            >
              ${isFav
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
              }
            </button>
            ${inUserPlaylist
              ? `<button class="song-ctx-btn w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-gray-500 hover:text-white flex items-center justify-center transition-all"
                   data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}' data-url="${audioUrl}" title="Song options">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                     <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                   </svg>
                 </button>`
              : `<button class="add-btn w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors" style="background:rgba(var(--theme-accent-rgb),0.18);color:var(--theme-accent)" data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}' title="Add to playlist">+</button>`
            }
            <!-- Download button -->
            <button class="dl-btn w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-white/5 transition-all" style="--hover-c:var(--theme-accent)"
              data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}'
              title="Download">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');

    // Attach song click listeners (guard against all action buttons)
    container.querySelectorAll('.song-item').forEach(el => {
      // ── Tap / Click ──
      el.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn, .remove-btn, .song-ctx-btn, .drag-handle, .fav-btn, .dl-btn')) return;
        const idx = parseInt(el.dataset.index);
        if (idx >= 0) Playlist.playAt(idx);
      });

      // ── Long-press (mobile) → open song detail modal ──
      // ONLY fires when long-pressing the artwork thumbnail image.
      // Must NOT fire from: row, title, container, or any other area.
      let longPressTimer = null;
      const artworkImg = el.querySelector('.relative.flex-shrink-0 img');
      if (artworkImg) {
        artworkImg.addEventListener('touchstart', (e) => {
          longPressTimer = setTimeout(() => {
            const idx = parseInt(el.dataset.index);
            if (idx < 0) return;
            const song = state.currentPlaylist[idx];
            if (song) {
              if (navigator.vibrate) navigator.vibrate(30);
              console.log('[SongModal] Long press on artwork → opening modal:', song.title);
              SongModal.open(song, idx);
            }
          }, 500);
        }, { passive: true });
        artworkImg.addEventListener('touchend',  () => { clearTimeout(longPressTimer); longPressTimer = null; }, { passive: true });
        artworkImg.addEventListener('touchmove', () => { clearTimeout(longPressTimer); longPressTimer = null; }, { passive: true });
      }
    });

    // Favorite buttons
    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = JSON.parse(btn.dataset.song);
        Favorites.toggle(song);
      });
    });

    // Add-to-playlist buttons
    container.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = JSON.parse(btn.dataset.song);
        UserPlaylists.showAddModal(song);
      });
    });

    // Song 3-dot context menu (user playlist rows)
    container.querySelectorAll('.song-ctx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song    = JSON.parse(btn.dataset.song);
        const audioUrl = btn.dataset.url;
        UI.showSongContextMenu(btn, song, audioUrl);
      });
    });

    // Remove-from-playlist buttons (legacy — kept for safety)
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        UserPlaylists.removeSong(state.activePlaylistName, btn.dataset.url);
      });
    });

    // Download buttons
    container.querySelectorAll('.dl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = JSON.parse(btn.dataset.song);
        Downloader.download(song);
      });
    });

    // Drag & drop for user playlists
    if (inUserPlaylist) {
      UI.initDragDrop(container);
    }
  },

  /** Highlight the currently playing song */
  highlightCurrentSong() {
    UI.renderSongList();
  },

  /**
   * Instantly update the visual highlight of the active song row WITHOUT a full re-render.
   * Used on click for immediate feedback. Falls back to full re-render if DOM isn't in sync.
   */
  _instantHighlight(activeIndex) {
    const container = document.getElementById('song-list');
    if (!container) return;
    const items = container.querySelectorAll('.song-item');
    // If item count doesn't match, fall back to full re-render
    if (items.length !== state.currentPlaylist.length) {
      UI.renderSongList();
      return;
    }
    items.forEach((el, i) => {
      const isActive = i === activeIndex;
      // Apply/remove active styling without a full re-render
      el.classList.toggle('bg-gradient-to-r', isActive);
      // Active state background applied via CSS .active-song class (theme-driven)
      el.classList.toggle('active-song', isActive);
      el.classList.toggle('hover:bg-white/5', !isActive);
      el.classList.toggle('border-transparent', !isActive);
      // Update title colour
      const titleEl = el.querySelector('.song-title');
      if (titleEl) {
        if (isActive) {
          titleEl.style.color = 'var(--theme-accent)';
        } else {
          titleEl.style.color = '';
        }
        titleEl.classList.toggle('text-white', !isActive);
      }
      // Show/hide playing bars overlay
      const imgWrap = el.querySelector('.relative.flex-shrink-0');
      if (imgWrap) {
        const existingBars = imgWrap.querySelector('.playing-bars-overlay');
        if (isActive && state.isPlaying) {
          if (!existingBars) {
            const bars = document.createElement('div');
            bars.className = 'playing-bars-overlay absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg';
            bars.innerHTML = `<div class="playing-bars flex gap-0.5 items-end h-4">
              <span class="bar w-1 rounded-full animate-bounce" style="height:60%;animation-delay:0s;background:var(--theme-accent)"></span>
              <span class="bar w-1 rounded-full animate-bounce" style="height:100%;animation-delay:0.15s;background:var(--theme-accent)"></span>
              <span class="bar w-1 rounded-full animate-bounce" style="height:70%;animation-delay:0.3s;background:var(--theme-accent)"></span>
            </div>`;
            imgWrap.appendChild(bars);
          }
        } else {
          existingBars?.remove();
        }
      }
    });
    // Scroll into view
    if (items[activeIndex]) {
      setTimeout(() => items[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  },

  /** Apply orbital orb animation to the randomly selected song row.
   *  Animation runs CONTINUOUSLY until user interaction.
   *  Uses AtmosphereEngine.RandomSongAnim for cinematic orb orbit. */
  applyRandomHighlight(index) {
    const container = document.getElementById('song-list');
    if (!container) return;

    // Remove legacy pulse class from any old items
    container.querySelectorAll('.random-selected').forEach(el => {
      el.classList.remove('random-selected');
    });

    const items = container.querySelectorAll('.song-item');
    const target = items[index];
    if (!target) return;

    console.log('[RandomSong] Applying persistent orbital highlight to index', index);

    // Add base glow class (CSS handles the background/border)
    target.classList.add('random-selected');

    // Attach animated orbital orb via atmosphere engine
    if (typeof AtmosphereEngine !== 'undefined' && AtmosphereEngine.RandomSongAnim) {
      AtmosphereEngine.attachRandomAnim(target);
    }

    // DO NOT auto-remove — animation stays until user interacts
    // (Cleared in _clearRandomAnim below, called on song play or new random pick)
  },

  /** Remove the orbital random animation. Called on any user interaction. */
  _clearRandomAnim() {
    const container = document.getElementById('song-list');
    if (container) {
      container.querySelectorAll('.random-selected').forEach(el => {
        el.classList.remove('random-selected');
      });
    }
    if (typeof AtmosphereEngine !== 'undefined' && AtmosphereEngine.RandomSongAnim) {
      AtmosphereEngine.detachRandomAnim();
    }
  },

  /** Scroll the song list to bring index into view */
  scrollToSong(index) {
    const container = document.getElementById('song-list');
    if (!container) return;
    const items = container.querySelectorAll('.song-item');
    if (items[index]) {
      items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /** Update the bottom player UI for a given song — syncs both mobile and desktop layouts */
  updatePlayerUI(song) {
    const artists = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '—');
    const thumb   = DataLoader.getThumbnailUrl(song);
    const fallback = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%23374151' rx='22'/><text x='22' y='28' text-anchor='middle' font-size='18'>🎵</text></svg>`;

    const set = (id, val, prop = 'textContent') => {
      const el = document.getElementById(id);
      if (el) el[prop] = val;
    };
    const setThumb = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.src = thumb;
      el.onerror = () => { el.src = fallback; };
      // Clicking thumbnail opens the song card modal
      el.style.cursor = 'pointer';
      el.onclick = () => {
        // [Atmosphere] Open immersive expand player; fallback to song modal
        if (typeof AtmosphereEngine !== 'undefined') {
          AtmosphereEngine.openExpand(song);
        } else {
          SongModal.open(song);
        }
      };
    };

    set('player-title',  song.title);
    set('player-artist', artists);
    setThumb('player-thumb');

    set('player-title-desktop',  song.title);
    set('player-artist-desktop', artists);
    setThumb('player-thumb-desktop');

    document.title = `♪ ${song.title} – SoundAura`;

    // Sync compact strip
    CompactMode.onSongChange(song);
  },

  /** Update playlist header meta */
  updatePlaylistMeta() {
    const meta      = document.getElementById('playlist-meta');
    const addBtn    = document.getElementById('add-songs-btn');
    const exportBtn = document.getElementById('export-playlist-btn');
    if (!meta) return;
    const count = state.currentPlaylist.length;
    const isUserPl  = state.activePlaylistName && state.activePlaylistName !== '__favorites__';

    const hide = (...els) => els.forEach(el => el?.classList.add('hidden'));
    const show = (...els) => els.forEach(el => { el?.classList.remove('hidden'); el?.classList.add('flex'); });

    if (state.currentFilter) {
      const type = state.currentFilter.type === 'mood' ? '🎭' : '🎤';
      meta.textContent = `${type} ${state.currentFilter.value} · ${count} songs`;
      hide(addBtn, exportBtn);
    } else if (state.activePlaylistName === '__favorites__') {
      meta.textContent = `❤️ Favorites · ${count} songs`;
      hide(addBtn);
      // Allow exporting favorites
      if (exportBtn) { exportBtn.classList.remove('hidden'); exportBtn.classList.add('flex'); }
    } else if (isUserPl) {
      meta.textContent = `📂 ${state.activePlaylistName} · ${count} songs`;
      show(addBtn, exportBtn);
    } else {
      meta.textContent = `🎵 All Songs · ${count} songs`;
      hide(addBtn, exportBtn);
    }
  },

  /** Set play/pause icon on both mobile and desktop buttons */
  setPlayPauseIcon(playing) {
    const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    const playIcon  = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    const icon = playing ? pauseIcon : playIcon;
    ['play-btn', 'play-btn-desktop'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.innerHTML = icon;
    });
    // [Performance] Mini/Popup player removed
  },

  /** Toggle dark / light theme */
  toggleTheme() {
    console.log('[Theme] Switching to', state.isDarkMode ? 'light' : 'dark');
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.classList.toggle('dark', state.isDarkMode);
    document.body.classList.toggle('light-mode', !state.isDarkMode);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = state.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    Storage.save('darkMode', state.isDarkMode);
    UI.updateFavicon();
    // Sync settings panel appearance buttons
    Settings._updateModeUI(state.isDarkMode);
    console.log('[Theme] Switched to', state.isDarkMode ? 'dark' : 'light');
    // [Atmosphere] Re-sync theme palette
    if (typeof AtmosphereEngine !== 'undefined') { AtmosphereEngine.ThemeSync?.refresh(); AtmosphereEngine.onThemeChange(); }
  },

  /** Dynamically update favicon AND navbar logo based on current theme.
   *
   *  Asset map (all paths absolute for zero ambiguity on GitHub Pages):
   *  • Favicon:      /soundaura/favicon/dark.svg   (dark mode)
   *                  /soundaura/favicon/light.svg  (light mode)
   *  • Navbar logo:  /soundaura/navbar_icon/dark.png  (dark mode)
   *                  /soundaura/navbar_icon/light.png (light mode)
   *  • App icon/splash: /soundaura/pwa_icon/splash.png (static, mode-independent)
   */
  updateFavicon() {
    // ── Favicon (browser tab icon) ──
    // Prefer the static <link id="favicon-link"> we put in <head>;
    // fall back to creating one dynamically if somehow absent.
    let link = document.getElementById('favicon-link') ||
               document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.id  = 'favicon-link';
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = state.isDarkMode
      ? '/soundaura/favicon/dark.svg'
      : '/soundaura/favicon/light.svg';

    // ── Navbar logo image ──
    const navLogo = document.getElementById('navbar-logo');
    if (navLogo) {
      navLogo.src = state.isDarkMode
        ? '/soundaura/navbar_icon/dark.png'
        : '/soundaura/navbar_icon/light.png';
    }
  },

  /** Initialize drag & drop for user playlist reordering.
   *  Uses Pointer Events API for instant, ghost-based drag on both desktop and touch.
   *  No long-press required — drag begins immediately from the handle.
   */
  initDragDrop(container) {
    const songList = document.getElementById('song-list');
    const SCROLL_EDGE = 80;

    let dragState   = null;   // active drag session
    let ghost       = null;   // floating clone element
    let insertLine  = null;   // visual insertion indicator
    let scrollRAF   = null;   // auto-scroll animation frame

    // ── Ghost: a styled clone of the dragged row ──────────────────
    function createGhost(sourceEl, clientX, clientY) {
      const rect = sourceEl.getBoundingClientRect();
      const g    = sourceEl.cloneNode(true);
      g.id       = 'drag-ghost';
      // Remove drag-handle cursor from ghost so it looks clean
      const handle = g.querySelector('.drag-handle');
      if (handle) handle.style.cursor = 'grabbing';
      Object.assign(g.style, {
        position:     'fixed',
        left:         `${rect.left}px`,
        top:          `${rect.top}px`,
        width:        `${rect.width}px`,
        height:       `${rect.height}px`,
        zIndex:       '9999',
        pointerEvents:'none',
        opacity:      '0.92',
        boxShadow:    '0 20px 56px rgba(0,0,0,0.65), 0 0 0 2px rgba(var(--theme-accent-rgb),0.5)',
        borderRadius: '12px',
        background:   'rgba(13,26,45,0.97)',
        border:       '1px solid rgba(var(--theme-accent-rgb),0.4)',
        transform:    'scale(1.025) rotate(0.4deg)',
        transition:   'box-shadow 0.1s ease',
        willChange:   'transform',
        backdropFilter:'blur(12px)',
      });
      document.body.appendChild(g);
      return g;
    }

    // ── Insertion line: a glowing line showing drop position ──────
    function createInsertLine() {
      const line = document.createElement('div');
      line.id    = 'drag-insert-line';
      Object.assign(line.style, {
        position:     'absolute',
        left:         '12px',
        right:        '12px',
        height:       '2px',
        background:   'linear-gradient(90deg, transparent, var(--theme-accent), transparent)',
        borderRadius: '999px',
        zIndex:       '100',
        pointerEvents:'none',
        boxShadow:    '0 0 10px rgba(var(--theme-accent-rgb),0.7)',
        display:      'none',
        transition:   'top 0.06s ease',
      });
      // container must be position:relative for absolute child to work
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(line);
      return line;
    }

    // ── Find which index to insert at, given cursor Y ─────────────
    function getInsertIndex(clientY, allItems, srcIdx) {
      for (let i = 0; i < allItems.length; i++) {
        if (i === srcIdx) continue;
        const rect = allItems[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return allItems.length; // after last item
    }

    // ── Position the insertion line ───────────────────────────────
    function positionInsertLine(insertIdx, allItems) {
      if (!insertLine) return;
      const containerRect = container.getBoundingClientRect();
      let topPx;
      if (insertIdx >= allItems.length) {
        const last = allItems[allItems.length - 1];
        if (!last) { insertLine.style.display = 'none'; return; }
        topPx = last.getBoundingClientRect().bottom - containerRect.top;
      } else {
        topPx = allItems[insertIdx].getBoundingClientRect().top - containerRect.top;
      }
      insertLine.style.top     = `${topPx - 1}px`;
      insertLine.style.display = 'block';
    }

    // ── Auto-scroll when ghost near top/bottom edges ─────────────
    function autoScroll(clientY) {
      if (!songList || !dragState) return;
      const rect        = songList.getBoundingClientRect();
      const distTop     = clientY - rect.top;
      const distBottom  = rect.bottom - clientY;
      let   speed       = 0;
      if      (distTop    < SCROLL_EDGE && distTop    > 0) speed = -Math.ceil((SCROLL_EDGE - distTop)    / SCROLL_EDGE * 14);
      else if (distBottom < SCROLL_EDGE && distBottom > 0) speed =  Math.ceil((SCROLL_EDGE - distBottom) / SCROLL_EDGE * 14);
      if (speed !== 0) {
        songList.scrollTop += speed;
        scrollRAF = requestAnimationFrame(() => autoScroll(dragState.lastY));
      } else {
        scrollRAF = null;
      }
    }

    // ── Cleanup everything after drag ends ───────────────────────
    function cleanup() {
      if (ghost)       { ghost.remove();       ghost       = null; }
      if (insertLine)  { insertLine.remove();   insertLine  = null; }
      if (scrollRAF)   { cancelAnimationFrame(scrollRAF);  scrollRAF = null; }
      if (dragState?.sourceEl) {
        dragState.sourceEl.style.opacity    = '';
        dragState.sourceEl.style.transition = '';
      }
      dragState = null;
      document.removeEventListener('pointermove',   onMove);
      document.removeEventListener('pointerup',     onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    // ── Pointer move handler ──────────────────────────────────────
    function onMove(e) {
      if (!dragState) return;
      e.preventDefault();
      const { clientX, clientY } = e;
      dragState.lastY = clientY;

      // Move ghost with cursor
      if (ghost) {
        ghost.style.left = `${clientX - dragState.offX}px`;
        ghost.style.top  = `${clientY - dragState.offY}px`;
      }

      // Compute insertion point + update visual indicator
      const allItems = Array.from(container.querySelectorAll('.song-item'));
      const insIdx   = getInsertIndex(clientY, allItems, dragState.srcIdx);
      dragState.insIdx = insIdx;
      positionInsertLine(insIdx, allItems);

      // Trigger auto-scroll
      if (!scrollRAF) scrollRAF = requestAnimationFrame(() => autoScroll(clientY));
    }

    // ── Pointer up / cancel handler ───────────────────────────────
    function onUp() {
      if (!dragState) return;
      const { srcIdx, insIdx } = dragState;

      if (srcIdx !== null && insIdx !== null && insIdx !== srcIdx && insIdx !== srcIdx + 1) {
        const playlist = state.userPlaylists[state.activePlaylistName];
        if (playlist) {
          const moved     = playlist.splice(srcIdx, 1)[0];
          const adjIdx    = insIdx > srcIdx ? insIdx - 1 : insIdx;
          playlist.splice(adjIdx, 0, moved);
          state.currentPlaylist = [...playlist];
          Storage.save('playlists', state.userPlaylists);
          if (state.currentSongId) {
            state.currentSongIndex = state.currentPlaylist.findIndex(
              s => songId(s) === state.currentSongId
            );
          }
          console.log('[DragDrop] Drop completed: moved', srcIdx, '→', adjIdx);
          Toast.show('↕ Reordered', 'info');
          cleanup();
          UI.renderSongList();
          return;
        }
      }
      cleanup();
    }

    // ── Attach pointerdown to every drag handle ───────────────────
    container.querySelectorAll('.drag-handle').forEach(handle => {
      handle.style.touchAction = 'none'; // prevent scroll steal on mobile

      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const item    = handle.closest('.song-item');
        if (!item) return;
        const srcIdx  = parseInt(item.dataset.dragIndex ?? handle.dataset.dragIndex);
        if (isNaN(srcIdx)) return;

        console.log('[DragDrop] Drag started at index', srcIdx);

        const rect = item.getBoundingClientRect();
        ghost      = createGhost(item, e.clientX, e.clientY);
        insertLine = createInsertLine();

        // Dim the source item with a smooth transition
        item.style.transition = 'opacity 0.15s ease';
        item.style.opacity    = '0.3';

        dragState = {
          sourceEl: item,
          srcIdx,
          insIdx:   srcIdx,
          offX:     e.clientX - rect.left,
          offY:     e.clientY - rect.top,
          lastY:    e.clientY,
        };

        // Capture so subsequent events still fire on this element even if pointer leaves
        try { handle.setPointerCapture(e.pointerId); } catch (_) {}

        document.addEventListener('pointermove',   onMove, { passive: false });
        document.addEventListener('pointerup',     onUp);
        document.addEventListener('pointercancel', onUp);
      });
    });
  },

  /**
   * Per-song 3-dot context menu for user playlist rows.
   * Options: Add to another playlist | Remove from current playlist
   */
  showSongContextMenu(triggerEl, song, audioUrl) {
    document.querySelectorAll('.song-ctx-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'song-ctx-menu fixed z-[100] rounded-xl shadow-2xl overflow-hidden';
    menu.style.cssText = 'min-width:172px;background:#0d1a2d;border:1px solid rgba(255,255,255,0.12);';
    menu.innerHTML = `
      <button class="sctx-add w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add to another playlist
      </button>
      <button class="sctx-remove w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left border-t border-white/5">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Remove from playlist
      </button>`;
    document.body.appendChild(menu);

    const rect = triggerEl.getBoundingClientRect();
    const menuW = 172, menuH = 88;
    let top  = rect.bottom + 6;
    let left = rect.right - menuW;
    if (left < 4) left = 4;
    if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 6;
    menu.style.top  = `${top}px`;
    menu.style.left = `${left}px`;

    menu.querySelector('.sctx-add').addEventListener('click', () => {
      menu.remove(); cleanup();
      UserPlaylists.showAddModal(song);
    });
    menu.querySelector('.sctx-remove').addEventListener('click', () => {
      menu.remove(); cleanup();
      UserPlaylists.removeSong(state.activePlaylistName, audioUrl);
    });

    const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); cleanup(); } };
    const closeKey = (e) => { if (e.key === 'Escape') { menu.remove(); cleanup(); } };
    const cleanup = () => {
      document.removeEventListener('click',      close,    true);
      document.removeEventListener('touchstart', close,    true);
      document.removeEventListener('keydown',    closeKey);
    };
    setTimeout(() => {
      document.addEventListener('click',      close,    true);
      document.addEventListener('touchstart', close,    true);
      document.addEventListener('keydown',    closeKey);
    }, 0);
  },

  /** Render user playlist sidebar */
  renderUserPlaylists() {
    const container = document.getElementById('user-playlists');
    if (!container) return;
    const names = Object.keys(state.userPlaylists);
    if (!names.length) {
      container.innerHTML = `<p class="text-xs text-gray-500 px-4 py-2">No playlists yet</p>`;
      return;
    }
    container.innerHTML = names.map(name => `
      <div class="playlist-item group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors
        ${state.activePlaylistName === name ? 'active-pl' : 'text-gray-300'}"
        data-name="${name}">
        <span class="text-sm truncate flex-1 min-w-0">📂 ${name}</span>
        <!-- 3-dot menu button — always visible (touch-friendly), not hover-only -->
        <button class="pl-menu-btn w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors flex-shrink-0 ml-1"
          data-name="${name}" title="Playlist options" aria-label="Playlist options">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Open playlist on item click (not on the menu button)
    container.querySelectorAll('.playlist-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.pl-menu-btn')) return;
        UserPlaylists.open(el.dataset.name);
      });
    });

    // 3-dot menu — opens a floating context menu (works on desktop hover AND mobile touch)
    container.querySelectorAll('.pl-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.showPlaylistContextMenu(btn, btn.dataset.name);
      });
    });

    // Always keep mobile drawer in sync
    if (typeof syncMobileDrawerPlaylists === 'function') syncMobileDrawerPlaylists();
  },

  /**
   * Show a small context menu for a playlist item.
   * Positions itself near the trigger button and closes on outside click.
   * Works on both desktop and mobile touch.
   */
  showPlaylistContextMenu(triggerEl, name) {
    // Remove any existing context menus first
    document.querySelectorAll('.pl-ctx-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'pl-ctx-menu fixed z-[100] rounded-xl shadow-2xl overflow-hidden';
    menu.style.cssText = `
      min-width: 148px;
      background: #0d1a2d;
      border: 1px solid rgba(255,255,255,0.12);
    `;
    menu.innerHTML = `
      <button class="pl-ctx-rename w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Rename
      </button>
      <button class="pl-ctx-delete w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left border-t border-white/5">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Delete
      </button>`;
    document.body.appendChild(menu);

    // Position: below the button, aligned to its right edge, clamped to viewport
    const rect = triggerEl.getBoundingClientRect();
    const menuW = 148;
    const menuH = 88; // approximate
    let top  = rect.bottom + 6;
    let left = rect.right - menuW;
    // Clamp to viewport
    if (left < 4) left = 4;
    if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 6;
    menu.style.top  = `${top}px`;
    menu.style.left = `${left}px`;

    // Wire buttons
    menu.querySelector('.pl-ctx-rename').addEventListener('click', () => {
      menu.remove();
      UserPlaylists.rename(name);
    });
    menu.querySelector('.pl-ctx-delete').addEventListener('click', () => {
      menu.remove();
      UserPlaylists.delete(name);
    });

    // Close on outside click / scroll / Esc
    const close = (e) => {
      if (!menu.contains(e.target)) { menu.remove(); cleanup(); }
    };
    const closeKey = (e) => { if (e.key === 'Escape') { menu.remove(); cleanup(); } };
    const cleanup = () => {
      document.removeEventListener('click',   close, true);
      document.removeEventListener('touchstart', close, true);
      document.removeEventListener('scroll',  closeOnScroll, true);
      document.removeEventListener('keydown', closeKey);
    };
    const closeOnScroll = () => { menu.remove(); cleanup(); };
    // Delay so the current click doesn't immediately close it
    setTimeout(() => {
      document.addEventListener('click',      close,       true);
      document.addEventListener('touchstart', close,       true);
      document.addEventListener('scroll',     closeOnScroll, true);
      document.addEventListener('keydown',    closeKey);
    }, 0);
  }
};

// ═══════════════════════════════════════════════════════════
// 10. EXPLORE MODAL
// ═══════════════════════════════════════════════════════════

const Explore = {
  open(forAddSongs = false) {
    console.log('[Explore] Modal opened, addSongsMode:', forAddSongs);
    state.addSongsMode = forAddSongs;
    state.selectedSongs.clear();
    const modal = document.getElementById('explore-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      Explore.renderMoods();
      Explore.renderSingers();
      // Show/hide selection header
      const selBar = document.getElementById('explore-selection-bar');
      if (selBar) {
        selBar.classList.toggle('hidden', !forAddSongs);
      }
      const title = document.getElementById('explore-title');
      if (title) title.textContent = forAddSongs ? 'Add Songs to Playlist' : 'Explore';
      Explore.updateSelectionCount();
    }
  },

  close() {
    console.log('[Explore] Modal closed');
    state.addSongsMode = false;
    state.selectedSongs.clear();
    const modal = document.getElementById('explore-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  updateSelectionCount() {
    const countEl = document.getElementById('selection-count');
    if (countEl) {
      const n = state.selectedSongs.size;
      countEl.textContent = n > 0 ? `${n} song${n > 1 ? 's' : ''} selected` : 'Select songs below';
    }
    const addBtn = document.getElementById('confirm-add-selection');
    if (addBtn) {
      addBtn.disabled = state.selectedSongs.size === 0;
      addBtn.classList.toggle('opacity-40', state.selectedSongs.size === 0);
    }
  },

  /** Confirm add selected songs into the active user playlist */
  confirmAddSelected() {
    if (!state.activePlaylistName || !state.selectedSongs.size) return;
    let added = 0;
    state.allSongs.forEach(song => {
      const url = DataLoader.getAudioUrl(song);
      if (state.selectedSongs.has(url)) {
        const exists = state.userPlaylists[state.activePlaylistName].some(
          s => DataLoader.getAudioUrl(s) === url
        );
        if (!exists) {
          state.userPlaylists[state.activePlaylistName].push(song);
          added++;
        }
      }
    });
    Storage.save('playlists', state.userPlaylists);
    // Refresh view
    state.currentPlaylist = [...state.userPlaylists[state.activePlaylistName]];
    UI.renderSongList();
    UI.updatePlaylistMeta();
    Toast.show(`✓ ${added} song${added !== 1 ? 's' : ''} added`, 'success');
    Explore.close();
  },

  renderMoods() {
    const container = document.getElementById('mood-grid');
    if (!container) return;

    // "All Songs" card — always first
    const allSongsCard = `
      <button
        class="mood-card col-span-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
        id="explore-all-songs-btn"
      >
        <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
             style="background:rgba(6,182,212,0.15);border:2px solid rgba(6,182,212,0.35);">
          <span class="text-xl">🎵</span>
        </div>
        <span class="text-sm font-semibold text-gray-200 group-hover:text-white">All Songs</span>
        <span class="ml-auto text-xs text-gray-500">${state.allSongs.length} songs</span>
      </button>`;

    container.innerHTML = allSongsCard + MOODS.map(mood => `
      <button
        class="mood-card flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
        data-mood="${mood.id}"
      >
        <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
             style="background:${mood.color}22; border:2px solid ${mood.color}44;">
          <img
            src="moods/${mood.id}.png"
            alt="${mood.label}"
            class="w-full h-full object-cover"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <span class="text-2xl w-full h-full items-center justify-center" style="display:none">${mood.emoji}</span>
        </div>
        <span class="mood-label text-xs font-medium text-gray-300 group-hover:text-white leading-tight text-center">${mood.label}</span>
      </button>
    `).join('');

    // All Songs card handler
    container.querySelector('#explore-all-songs-btn')?.addEventListener('click', () => {
      if (state.addSongsMode) {
        const sorted = [...state.allSongs].sort((a, b) => a.title.localeCompare(b.title));
        Explore.showSelectionList(sorted, 'All Songs');
      } else {
        state.activePlaylistName = null;
        Playlist.loadAll();
        UI.renderUserPlaylists();
        Explore.close();
        Toast.show(`🎵 Loaded all ${state.allSongs.length} songs`, 'success');
      }
    });

    // [data-mood] excludes the "All Songs" card (no mood attr) so it doesn't
    // also fire the mood handler with mood=undefined → 0 results + broken toast
    container.querySelectorAll('.mood-card[data-mood]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        const songs = DataLoader.filterByMood(mood);
        /* Use .mood-label — not span:last-child which breaks with nested elements */
        const label = btn.querySelector('.mood-label')?.textContent?.trim() || mood;
        if (state.addSongsMode) {
          Explore.showSelectionList(songs, label);
        } else {
          state.activePlaylistName = null;
          Playlist.set(songs, { type: 'mood', value: label });
          UI.renderUserPlaylists();
          Explore.close();
          Toast.show(`Loaded ${songs.length} songs for ${label}`, 'success');
          document.getElementById('song-list-section')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  },

  renderSingers() {
    const container = document.getElementById('singer-grid');
    if (!container) return;
    container.innerHTML = SINGERS.map(singer => {
      const initials = singer.split(' ').map(w => w[0]).join('').slice(0, 2);
      const imgPath = `choice/${singer.replace(/ /g, '_')}.jpg`;
      return `
        <button
          class="singer-card flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/10 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
          data-singer="${singer}"
        >
          <div class="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,rgba(var(--theme-accent-rgb),0.3),rgba(var(--theme-accent-rgb),0.15))">
            <img src="${imgPath}" alt="${singer}"
              class="w-full h-full object-cover"
              onerror="this.style.display='none';this.nextSibling.style.display='flex'"
            />
            <span class="text-sm font-bold hidden items-center justify-center w-full h-full" style="color:var(--theme-accent)">${initials}</span>
          </div>
          <span class="text-xs text-gray-300 group-hover:text-white text-center leading-tight">${singer}</span>
        </button>`;
    }).join('');

    container.querySelectorAll('.singer-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const singer = btn.dataset.singer;
        const songs = DataLoader.filterByArtist(singer);
        if (state.addSongsMode) {
          Explore.showSelectionList(songs, singer);
        } else {
          state.activePlaylistName = null; // clear stale playlist context
          Playlist.set(songs, { type: 'singer', value: singer });
          UI.renderUserPlaylists();
          Explore.close();
          Toast.show(`Loaded ${songs.length} songs by ${singer}`, 'success');
          document.getElementById('song-list-section')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  },

  /** Show a song list inside Explore for multi-select (add songs mode) */
  showSelectionList(songs, label) {
    const moodSection = document.getElementById('mood-section');
    const singerSection = document.getElementById('singer-section');
    if (moodSection) moodSection.classList.add('hidden');
    if (singerSection) singerSection.classList.add('hidden');

    let sel = document.getElementById('selection-list-section');
    if (!sel) {
      sel = document.createElement('div');
      sel.id = 'selection-list-section';
      document.querySelector('#explore-modal .flex-1.overflow-y-auto')?.appendChild(sel);
    }
    sel.classList.remove('hidden');

    // Store the full list for search filtering
    sel._allSongs = songs;
    sel._label    = label;

    const renderList = (filtered) => {
      const listEl = sel.querySelector('#sel-song-list');
      if (!listEl) return;
      listEl.innerHTML = filtered.map((song) => {
        const url = DataLoader.getAudioUrl(song);
        const artists = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
        const checked = state.selectedSongs.has(url);
        return `
          <label class="sel-song-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
            ${checked ? 'bg-cyan-500/15 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'} transition-all" data-url="${url}">
            <input type="checkbox" class="song-check w-4 h-4 accent-cyan-400 flex-shrink-0" data-url="${url}" ${checked ? 'checked' : ''} />
            <img src="${DataLoader.getThumbnailUrl(song)}" class="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-gray-800"
              onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2236%22 height=%2236%22 viewBox=%220 0 36 36%22><rect width=%2236%22 height=%2236%22 fill=%22%23374151%22 rx=%228%22/><text x=%2218%22 y=%2224%22 text-anchor=%22middle%22 font-size=%2216%22>🎵</text></svg>'"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">${song.title}</p>
              <p class="text-xs text-gray-400 truncate">${artists}</p>
            </div>
          </label>`;
      }).join('') || '<p class="text-center text-gray-500 text-sm py-6">No songs match your search</p>';

      // Wire checkboxes
      listEl.querySelectorAll('.song-check').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) state.selectedSongs.add(cb.dataset.url);
          else state.selectedSongs.delete(cb.dataset.url);
          const lbl = cb.closest('label');
          if (lbl) {
            lbl.style.background = cb.checked ? `rgba(var(--theme-accent-rgb),0.15)` : '';
            lbl.style.borderColor = cb.checked ? `rgba(var(--theme-accent-rgb),0.3)` : '';
            lbl.classList.toggle('border-transparent', !cb.checked);
          }
          Explore.updateSelectionCount();
        });
      });
    };

    sel.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <button id="sel-back-btn" class="text-gray-400 hover:text-cyan-400 transition-colors text-lg">←</button>
        <span class="text-sm font-medium text-gray-300">${label} · ${songs.length} songs</span>
        <button id="sel-all-btn" class="ml-auto text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors">Select All</button>
      </div>
      <!-- Search bar -->
      <div class="relative mb-3">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="sel-search" type="text" placeholder="Search songs…"
          class="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all" />
      </div>
      <div id="sel-song-list" class="space-y-1"></div>`;

    renderList(songs);

    // Back button
    sel.querySelector('#sel-back-btn')?.addEventListener('click', () => {
      sel.classList.add('hidden');
      if (moodSection) moodSection.classList.remove('hidden');
      if (singerSection) singerSection.classList.remove('hidden');
      // Restore active tab visibility
      const tabMoodActive = !document.getElementById('tab-mood')?.classList.contains('active') === false;
      if (tabMoodActive) singerSection?.classList.add('hidden');
    });

    // ── [FIX P-6] Live search — FuzzySearch for typo-tolerance ──
    // The main search bar uses FuzzySearch; the add-songs modal was
    // using a basic .includes() filter.  Replace with FuzzySearch so
    // both surfaces behave identically: case-insensitive, partial
    // match, typo-tolerant, best matches ranked first.
    sel.querySelector('#sel-search')?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      // FuzzySearch.rank returns the full songs array when q is empty.
      const filtered = q ? FuzzySearch.rank(songs, q) : songs;
      renderList(filtered);

      // [FIX P-6] Scroll results to top so best matches are visible
      // immediately — same behaviour as the main search.
      const listEl = sel.querySelector('#sel-song-list');
      if (listEl) listEl.scrollTop = 0;
    });

    // Select All button — operates on the VISIBLE (filtered) subset
    // so selecting all while searching only checks the matched songs.
    sel.querySelector('#sel-all-btn')?.addEventListener('click', () => {
      const allChecked = songs.every(s => state.selectedSongs.has(DataLoader.getAudioUrl(s)));
      songs.forEach(s => {
        const url = DataLoader.getAudioUrl(s);
        if (allChecked) state.selectedSongs.delete(url);
        else state.selectedSongs.add(url);
      });
      // [FIX P-6b] Re-use FuzzySearch so the re-rendered list matches
      // what the search input is currently showing.
      const q = sel.querySelector('#sel-search')?.value.trim() || '';
      const filtered = q ? FuzzySearch.rank(songs, q) : songs;
      renderList(filtered);
      Explore.updateSelectionCount();
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 11a. EQ PANEL MODULE (Draggable + Custom Presets)
// ═══════════════════════════════════════════════════════════

const EQPanel = {
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,

  /** Open a large expanded EQ modal for fine control */
  openExpanded() {
    const existing = document.getElementById('eq-expanded-modal');
    if (existing) { existing.remove(); return; }

    const currentVals = EQ_BANDS.map((_, i) => {
      const s = document.getElementById(`eq-band-${i}`);
      return s ? parseFloat(s.value) : 0;
    });

    const modal = document.createElement('div');
    modal.id = 'eq-expanded-modal';
    modal.className = 'fixed inset-0 z-[80] flex items-end sm:items-center justify-center modal-backdrop bg-black/80 p-0 sm:p-4';
    modal.innerHTML = `
      <div class="w-full sm:max-w-2xl bg-gray-950 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl"
           style="max-height:92dvh;display:flex;flex-direction:column;overflow:hidden;">

        <!-- Header — icon-only action buttons -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-base">🎛️</span>
            <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;color:white;font-size:1rem;">Equalizer</h2>
          </div>
          <div class="flex items-center gap-1.5">
            <!-- Reset All — icon only -->
            <button id="eq-exp-reset" title="Reset All"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/12 text-gray-400 hover:text-cyan-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <!-- Save Preset — icon only -->
            <button id="eq-exp-save" title="Save Preset"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
            <!-- Close -->
            <button id="eq-exp-close"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Scrollable content -->
        <div style="flex:1;overflow-y:auto;min-height:0;padding:1rem;">

          <!-- EQ Bands: taller, responsive height, no group labels -->
          <div class="flex items-end justify-between gap-0" style="height:clamp(160px,45vw,260px);margin-bottom:0.5rem;">
            ${EQ_BANDS.map((band, i) => {
              const val = currentVals[i];
              return `
              <div class="flex flex-col items-center gap-1 flex-1 min-w-0" data-band="${i}">
                <span class="eq-exp-val tabular-nums" style="font-size:9px;color:#6b7fa0;min-width:24px;text-align:center;">${val > 0 ? '+' : ''}${val}</span>
                <input type="range" class="eq-exp-slider" data-band="${i}"
                  min="-12" max="12" step="0.5" value="${val}"
                  style="writing-mode:vertical-lr;direction:rtl;width:24px;height:calc(clamp(160px,45vw,260px) - 42px);cursor:pointer;accent-color:var(--theme-accent);flex-shrink:0;" />
                <span style="font-size:8px;color:#4b5563;margin-top:1px;">${band.label}</span>
              </div>`;
            }).join('')}
          </div>

          <!-- Built-in presets -->
          <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:0.75rem;margin-top:0.75rem;">
            <p style="font-size:10px;color:#6b7fa0;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">Presets</p>
            <div class="flex gap-1.5 flex-wrap">
              <button class="eq-exp-preset" data-preset="flat">Flat</button>
              <button class="eq-exp-preset" data-preset="bass">Bass Boost</button>
              <button class="eq-exp-preset" data-preset="vocal">Vocal</button>
              <button class="eq-exp-preset" data-preset="treble">Treble</button>
            </div>
          </div>

          <!-- User-saved presets -->
          <div id="eq-exp-custom-presets" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:0.75rem;margin-top:0.75rem;">
            <p style="font-size:10px;color:#6b7fa0;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">My Presets</p>
            <div class="eq-exp-custom-list flex flex-wrap gap-1.5">
              <span style="font-size:11px;color:#374151;font-style:italic;">No saved presets yet</span>
            </div>
          </div>
        </div>
      </div>

      <style>
        .eq-exp-preset {
          font-size: 11px; padding: 4px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #9ca3af; cursor: pointer; transition: background 0.12s, color 0.12s;
        }
        .eq-exp-preset:hover { background: rgba(var(--theme-accent-rgb),0.2); color: var(--theme-accent); border-color: rgba(var(--theme-accent-rgb),0.35); }
        .eq-exp-preset:active { transform: scale(0.95); }
      </style>`;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#eq-exp-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    // Slider sync
    modal.querySelectorAll('.eq-exp-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const i = parseInt(slider.dataset.band);
        const val = parseFloat(slider.value);
        const valEl = slider.closest('[data-band]').querySelector('.eq-exp-val');
        if (valEl) valEl.textContent = (val > 0 ? '+' : '') + val;
        const compact = document.getElementById(`eq-band-${i}`);
        if (compact) {
          compact.value = val;
          compact.parentElement.querySelector('.eq-value').textContent = val;
        }
        AudioEngine.init();
        AudioEngine.setEQBand(i, val);
      });
    });

    // Reset
    modal.querySelector('#eq-exp-reset').addEventListener('click', () => {
      modal.querySelectorAll('.eq-exp-slider').forEach(slider => {
        slider.value = 0;
        const valEl = slider.closest('[data-band]').querySelector('.eq-exp-val');
        if (valEl) valEl.textContent = '0';
      });
      AudioEngine.resetEQ();
    });

    // Save preset
    modal.querySelector('#eq-exp-save').addEventListener('click', () => {
      const name = prompt('Preset name:');
      if (name) {
        AudioEngine.saveCurrentPreset(name);
        // Refresh user preset section
        EQPanel._renderCustomPresetsInModal(modal);
      }
    });

    // Built-in presets
    const BUILTIN = { flat:[0,0,0,0,0,0,0,0,0,0], bass:[8,6,4,2,0,-1,-2,-2,-2,-3], vocal:[-3,-2,0,3,5,5,3,1,0,-2], treble:[-3,-2,-1,0,1,3,5,7,8,9] };
    modal.querySelectorAll('.eq-exp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const vals = BUILTIN[btn.dataset.preset];
        if (!vals) return;
        modal.querySelectorAll('.eq-exp-slider').forEach((slider, i) => {
          slider.value = vals[i];
          const valEl = slider.closest('[data-band]').querySelector('.eq-exp-val');
          if (valEl) valEl.textContent = (vals[i] > 0 ? '+' : '') + vals[i];
        });
        AudioEngine.init();
        AudioEngine.applyPreset(vals);
      });
    });

    // User-saved presets
    EQPanel._renderCustomPresetsInModal(modal);
  },

  /** Render (or refresh) user presets inside the expanded EQ modal */
  _renderCustomPresetsInModal(modal) {
    const customPresets = Storage.loadCustomPresets();
    const listEl = modal?.querySelector('.eq-exp-custom-list');
    if (!listEl) return;
    const names = Object.keys(customPresets);
    if (!names.length) {
      listEl.innerHTML = '<span style="font-size:11px;color:#374151;font-style:italic;">No saved presets yet</span>';
      return;
    }
    listEl.innerHTML = names.map(name => `
      <button class="eq-exp-custom-preset" data-name="${name.replace(/"/g,'&quot;')}"
        style="font-size:11px;padding:4px 12px;border-radius:999px;
          background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.25);
          color:var(--theme-accent);cursor:pointer;transition:background 0.12s;">
        ${name}
      </button>`).join('');
    listEl.querySelectorAll('.eq-exp-custom-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const vals = customPresets[btn.dataset.name];
        if (!vals) return;
        modal.querySelectorAll('.eq-exp-slider').forEach((slider, i) => {
          slider.value = vals[i] ?? 0;
          const valEl = slider.closest('[data-band]').querySelector('.eq-exp-val');
          if (valEl) valEl.textContent = ((vals[i]??0) > 0 ? '+' : '') + (vals[i]??0);
        });
        AudioEngine.init();
        AudioEngine.applyPreset(vals);
      });
    });
  },

  /** Make the EQ panel draggable, clamped to viewport */
  initDraggable() {
    const panel = document.getElementById('eq-panel');
    const handle = document.getElementById('eq-drag-handle');
    if (!panel || !handle) return;

    const onMove = (clientX, clientY) => {
      if (!EQPanel.isDragging) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const pw = panel.offsetWidth, ph = panel.offsetHeight;
      let x = clientX - EQPanel.dragOffsetX;
      let y = clientY - EQPanel.dragOffsetY;
      // Clamp within viewport
      x = Math.max(0, Math.min(x, vw - pw));
      y = Math.max(0, Math.min(y, vh - ph));
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      EQPanel.isDragging = true;
      const rect = panel.getBoundingClientRect();
      EQPanel.dragOffsetX = e.clientX - rect.left;
      EQPanel.dragOffsetY = e.clientY - rect.top;
    });
    handle.addEventListener('touchstart', (e) => {
      EQPanel.isDragging = true;
      const t = e.touches[0];
      const rect = panel.getBoundingClientRect();
      EQPanel.dragOffsetX = t.clientX - rect.left;
      EQPanel.dragOffsetY = t.clientY - rect.top;
    }, { passive: true });

    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => {
      if (!EQPanel.isDragging) return;
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('mouseup', () => EQPanel.isDragging = false);
    document.addEventListener('touchend', () => EQPanel.isDragging = false);
  },

  /** Render custom presets in the EQ panel */
  renderCustomPresets() {
    const container = document.getElementById('custom-presets-container');
    if (!container) return;
    const presets = Storage.loadCustomPresets();
    const names = Object.keys(presets);
    if (!names.length) {
      container.innerHTML = `<p class="text-xs text-gray-600 italic">No saved presets yet</p>`;
      return;
    }
    container.innerHTML = names.map(name => `
      <div class="flex items-center gap-1">
        <button class="apply-preset flex-1 text-xs px-2 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors truncate text-left" data-name="${name}">
          ★ ${name}
        </button>
        <button class="del-preset text-gray-600 hover:text-red-400 text-xs px-1 transition-colors" data-name="${name}" title="Delete">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.apply-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Storage.loadCustomPresets()[btn.dataset.name];
        if (p) AudioEngine.applyPreset(p);
        Toast.show(`Applied: ${btn.dataset.name}`, 'info');
      });
    });
    container.querySelectorAll('.del-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        Storage.deleteCustomPreset(btn.dataset.name);
        EQPanel.renderCustomPresets();
        Toast.show(`Deleted preset: ${btn.dataset.name}`, 'info');
      });
    });
  }
};

// ═══════════════════════════════════════════════════════════
// SETTINGS SYSTEM
// ═══════════════════════════════════════════════════════════

const Settings = {

  _save(key, value) {
    const s = Storage.load('settings', {});
    s[key] = value;
    Storage.save('settings', s);
  },

  applyTheme(themeId) {
    if (!THEMES[themeId]) themeId = 'ocean-blue';
    console.log('[Settings] Theme changed:', themeId);
    console.log('[Theme] Applied:', themeId);
    state.currentTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    const t = THEMES[themeId];
    const root = document.documentElement;
    root.style.setProperty('--theme-accent',     t.accent);
    root.style.setProperty('--theme-accent2',    t.accent2);
    root.style.setProperty('--theme-accent-rgb', t.rgb);
    root.style.setProperty('--theme-glow',       `rgba(${t.rgb},0.35)`);
    root.style.setProperty('--theme-glow-soft',  `rgba(${t.rgb},0.15)`);
    Settings._save('theme', themeId);
    Settings._updateThemeUI(themeId);
    Settings._refreshSpeedSliders();
    // [Atmosphere] Sync theme accent colors
    if (typeof AtmosphereEngine !== 'undefined') { AtmosphereEngine.ThemeSync?.refresh(); AtmosphereEngine.onThemeChange(); }
  },

  _refreshSpeedSliders() {
    const t = THEMES[state.currentTheme];
    if (!t) return;
    ['speed-slider-mobile', 'speed-slider-desktop', 'speed-modal-slider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const pct = ((parseFloat(el.value) - 0.5) / 1.5 * 100).toFixed(1);
        el.style.background = `linear-gradient(to right, ${t.accent} ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
      }
    });
  },

  applyParticles(enabled) {
    console.log('[Settings] Particles:', enabled ? 'ON' : 'OFF');
    state.particlesOn = enabled;
    document.body.classList.toggle('particles-enabled', enabled);
    Settings._save('particles', enabled);
    Settings._updateParticlesUI(enabled);
    // [Atmosphere] Toggle home particle system
    if (typeof AtmosphereEngine !== 'undefined') AtmosphereEngine.toggleParticles(enabled);
  },

  open() {
    console.log('[Settings] Modal opened');
    Settings._renderThemeGrid();
    const modal = document.getElementById('settings-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    Settings._updateModeUI(state.isDarkMode);
    Settings._updateParticlesUI(state.particlesOn);
    Settings._updateThemeUI(state.currentTheme);
  },

  close() {
    console.log('[Settings] Modal closed');
    const modal = document.getElementById('settings-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  },

  _renderThemeGrid() {
    const grid = document.getElementById('theme-options-grid');
    if (!grid || grid.dataset.rendered) return;
    grid.dataset.rendered = '1';
    grid.innerHTML = Object.entries(THEMES).map(([id, t]) => `
      <button class="theme-option-btn" data-theme="${id}">
        <span class="w-5 h-5 rounded-full flex-shrink-0 inline-block"
              style="background:${t.swatch};box-shadow:0 1px 4px rgba(0,0,0,0.3)"></span>
        <span>${t.emoji} ${t.name}</span>
      </button>
    `).join('');
    grid.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => Settings.applyTheme(btn.dataset.theme));
    });
  },

  _updateModeUI(isDark) {
    const darkBtn  = document.getElementById('settings-dark-btn');
    const lightBtn = document.getElementById('settings-light-btn');
    if (!darkBtn || !lightBtn) return;
    [darkBtn, lightBtn].forEach(b => b.classList.remove('settings-btn-active','settings-btn-inactive'));
    darkBtn.classList.add( isDark  ? 'settings-btn-active' : 'settings-btn-inactive');
    lightBtn.classList.add(!isDark ? 'settings-btn-active' : 'settings-btn-inactive');
    darkBtn.style.border  = isDark  ? `1.5px solid rgba(var(--theme-accent-rgb),0.5)` : '';
    lightBtn.style.border = !isDark ? `1.5px solid rgba(var(--theme-accent-rgb),0.5)` : '';
  },

  _updateParticlesUI(enabled) {
    const onBtn  = document.getElementById('settings-particles-on');
    const offBtn = document.getElementById('settings-particles-off');
    if (!onBtn || !offBtn) return;
    [onBtn, offBtn].forEach(b => b.classList.remove('settings-btn-active','settings-btn-inactive'));
    onBtn.classList.add( enabled  ? 'settings-btn-active' : 'settings-btn-inactive');
    offBtn.classList.add(!enabled ? 'settings-btn-active' : 'settings-btn-inactive');
    onBtn.style.border  = enabled  ? `1.5px solid rgba(var(--theme-accent-rgb),0.5)` : '';
    offBtn.style.border = !enabled ? `1.5px solid rgba(var(--theme-accent-rgb),0.5)` : '';
  },

  _updateThemeUI(themeId) {
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      const isActive = btn.dataset.theme === themeId;
      btn.classList.toggle('theme-option-active', isActive);
      if (isActive) {
        const t = THEMES[themeId];
        btn.style.background  = `rgba(${t.rgb},0.12)`;
        btn.style.borderColor = `rgba(${t.rgb},0.55)`;
        btn.style.boxShadow   = `0 0 12px rgba(${t.rgb},0.18)`;
        btn.style.color       = t.accent;
      } else {
        btn.style.background  = '';
        btn.style.borderColor = '';
        btn.style.boxShadow   = '';
        btn.style.color       = '';
      }
    });
  }
};




const UserPlaylists = {
  /** Rename a playlist — shows inline modal with pre-filled name */
  rename(oldName) {
    // Build a clean inline modal
    const existing = document.getElementById('rename-pl-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rename-pl-modal';
    modal.className = 'fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-white/10 rounded-2xl p-5 w-80 shadow-2xl">
        <h3 class="text-white font-semibold text-sm mb-3">Rename Playlist</h3>
        <input id="rename-pl-input" type="text" value="${oldName.replace(/"/g, '&quot;')}"
          class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                 focus:outline-none mb-3" style="focus-color:var(--theme-accent)" />
        <div class="flex gap-2">
          <button id="rename-pl-confirm" class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors" style="background:rgba(var(--theme-accent-rgb),0.18);color:var(--theme-accent)">Rename</button>
          <button id="rename-pl-cancel"  class="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors">Cancel</button>
        </div>
        <p id="rename-pl-error" class="text-red-400 text-xs mt-2 hidden"></p>
      </div>`;
    document.body.appendChild(modal);

    const input  = modal.querySelector('#rename-pl-input');
    const errEl  = modal.querySelector('#rename-pl-error');
    input.focus();
    input.select();

    const doRename = () => {
      const newName = input.value.trim();
      if (!newName) { errEl.textContent = 'Name cannot be empty'; errEl.classList.remove('hidden'); return; }
      if (newName === oldName) { modal.remove(); return; }
      if (state.userPlaylists[newName]) { errEl.textContent = `"${newName}" already exists`; errEl.classList.remove('hidden'); return; }

      // Rename in state
      state.userPlaylists[newName] = state.userPlaylists[oldName];
      delete state.userPlaylists[oldName];

      // Update activePlaylistName if needed
      if (state.activePlaylistName === oldName) state.activePlaylistName = newName;

      Storage.save('playlists', state.userPlaylists);

      // Update lastContext if it pointed to this playlist
      const ctx = Storage.load('lastContext', null);
      if (ctx?.type === 'playlist' && ctx.value === oldName) {
        Storage.save('lastContext', { type: 'playlist', value: newName });
      }

      UI.renderUserPlaylists();
      UI.updatePlaylistMeta();
      Toast.show(`✓ Renamed to "${newName}"`, 'success');
      modal.remove();
    };

    modal.querySelector('#rename-pl-confirm').addEventListener('click', doRename);
    modal.querySelector('#rename-pl-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doRename();
      if (e.key === 'Escape') modal.remove();
    });
  },

  /** Create a new playlist */
  create(name) {
    console.log('[Playlist] Creating playlist:', name);
    if (!name.trim()) return Toast.show('Enter a playlist name', 'error');
    if (state.userPlaylists[name]) return Toast.show('Playlist already exists', 'error');
    state.userPlaylists[name] = [];
    Storage.save('playlists', state.userPlaylists);
    // Refresh both desktop sidebar and mobile drawer immediately
    UI.renderUserPlaylists();
    if (typeof syncMobileDrawerPlaylists === 'function') syncMobileDrawerPlaylists();
    Toast.show(`✓ Created: ${name}`, 'success');
  },

  /** Open a user playlist in the main view */
  open(name) {
    if (!state.userPlaylists[name]) return;
    state.activePlaylistName = name;
    Playlist.set(state.userPlaylists[name], null);
    UI.updatePlaylistMeta();
    UI.renderUserPlaylists();
    document.getElementById('song-list-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  /** Show modal to pick which playlist to add a song to */
  showAddModal(song) {
    const names = Object.keys(state.userPlaylists);
    if (!names.length) {
      Toast.show('Create a playlist first (+ New Playlist)', 'info');
      return;
    }

    // Simple inline modal
    const existing = document.getElementById('add-to-pl-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'add-to-pl-modal';
    /* z-[90]: must sit above song-detail-modal (z-[70]) even during its close animation */
    modal.className = 'fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
        <h3 class="text-white font-semibold mb-4">Add to Playlist</h3>
        <p class="text-gray-400 text-sm mb-4 truncate">🎵 ${song.title}</p>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          ${names.map(n => `
            <button class="pl-choice w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-white text-sm transition-colors" data-name="${n}">
              📂 ${n}
            </button>`).join('')}
        </div>
        <button id="close-add-modal" class="mt-4 w-full py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
      </div>`;

    document.body.appendChild(modal);
    modal.querySelector('#close-add-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.pl-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        UserPlaylists.addSong(btn.dataset.name, song);
        modal.remove();
      });
    });
  },

  /** Add a song to a named playlist */
  addSong(playlistName, song) {
    if (!state.userPlaylists[playlistName]) return;
    const audioUrl = DataLoader.getAudioUrl(song);
    const exists = state.userPlaylists[playlistName].some(s => DataLoader.getAudioUrl(s) === audioUrl);
    if (exists) {
      Toast.show(`Already in ${playlistName}`, 'warning');
      return;
    }
    state.userPlaylists[playlistName].push(song);
    Storage.save('playlists', state.userPlaylists);
    Toast.show(`Added to ${playlistName}`, 'success');
    // Refresh if currently viewing this playlist
    if (state.activePlaylistName === playlistName) {
      state.currentPlaylist = [...state.userPlaylists[playlistName]];
      UI.renderSongList();
    }
  },

  /** Remove a song from a playlist by audio URL */
  removeSong(playlistName, audioUrl) {
    if (!state.userPlaylists[playlistName]) return;

    // Check if we're about to remove the currently playing song
    const removedSong = state.userPlaylists[playlistName].find(
      s => DataLoader.getAudioUrl(s) === audioUrl
    );
    const removingCurrentSong = removedSong && songId(removedSong) === state.currentSongId;

    state.userPlaylists[playlistName] = state.userPlaylists[playlistName]
      .filter(s => DataLoader.getAudioUrl(s) !== audioUrl);
    Storage.save('playlists', state.userPlaylists);

    if (state.activePlaylistName === playlistName) {
      state.currentPlaylist = [...state.userPlaylists[playlistName]];

      if (removingCurrentSong) {
        // Currently playing song was removed — play next logical track or stop
        const nextIdx = state.currentPlaylist.length > 0
          ? Math.min(state.currentSongIndex, state.currentPlaylist.length - 1)
          : -1;
        if (nextIdx >= 0) {
          Playlist.playAt(nextIdx, true);
        } else {
          Player.stop();
          state.currentSongId = null;
          state.currentSongIndex = -1;
        }
        Toast.show('Song removed — playing next', 'info');
      } else {
        // Resync index for non-current song removal
        if (state.currentSongId) {
          state.currentSongIndex = state.currentPlaylist.findIndex(
            s => songId(s) === state.currentSongId
          );
        }
        Toast.show('Removed from playlist', 'info');
      }

      UI.renderSongList();
      UI.updatePlaylistMeta();
    } else {
      Toast.show('Removed from playlist', 'info');
    }
  },

  /** Delete a playlist entirely */
  delete(name) {
    if (!confirm(`Delete playlist "${name}"?`)) return;
    delete state.userPlaylists[name];
    if (state.activePlaylistName === name) {
      state.activePlaylistName = null;
      Playlist.loadAll();
    }
    Storage.save('playlists', state.userPlaylists);
    UI.renderUserPlaylists();
    Toast.show(`Deleted: ${name}`, 'info');
  }
};

// ═══════════════════════════════════════════════════════════
// 11b. FAVORITES SYSTEM
// ═══════════════════════════════════════════════════════════

const Favorites = {
  /** Toggle a song's favorite status */
  toggle(song) {
    const id = songId(song);
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      Toast.show('💔 Removed from Favorites', 'info');
    } else {
      state.favorites.add(id);
      Toast.show('❤️ Added to Favorites', 'success');
    }
    // Persist as array
    Storage.save('favorites', [...state.favorites]);
    // Re-render current list so heart state updates globally
    UI.renderSongList();
    // If the Favorites view is open, refresh it too
    if (state.activePlaylistName === '__favorites__') {
      Favorites.openView();
    }
    // Update sidebar heart count badge
    Favorites.updateSidebarBadge();
  },

  has(song) {
    return state.favorites.has(songId(song));
  },

  /** Get all favorited songs from allSongs (preserves order added) */
  getSongs() {
    return state.allSongs.filter(s => state.favorites.has(songId(s)));
  },

  /** Open the Favorites view in the main song list */
  openView() {
    state.activePlaylistName = '__favorites__';
    state.currentFilter = null;
    const songs = Favorites.getSongs();
    state.currentPlaylist = songs;
    state.currentSongIndex = state.currentSongId
      ? songs.findIndex(s => songId(s) === state.currentSongId)
      : -1;
    UI.renderSongList();
    // Special meta
    const meta = document.getElementById('playlist-meta');
    if (meta) meta.textContent = `❤️ Favorites · ${songs.length} songs`;
    const addBtn = document.getElementById('add-songs-btn');
    if (addBtn) addBtn.classList.add('hidden');
    UI.renderUserPlaylists();
    Storage.save('lastContext', { type: 'favorites', value: null });
    document.getElementById('song-list-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  /** Update the heart badge count in the sidebar */
  updateSidebarBadge() {
    const badge = document.getElementById('fav-count-badge');
    if (badge) badge.textContent = state.favorites.size || '';
  }
};

const SongModal = {
  /** Open the song detail modal for a given song object.
   *  playlistIdx (optional): if provided, shows a "Play Now" button. */
  open(song, playlistIdx = -1) {
    if (!song) return;
    const artists = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '—');
    const moods   = Array.isArray(song.mood)   ? song.mood : [];
    const thumb   = DataLoader.getThumbnailUrl(song);
    const isFav   = state.favorites.has(songId(song));

    // Remove any existing modal
    SongModal.close();

    const modal = document.createElement('div');
    modal.id = 'song-detail-modal';
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center modal-backdrop bg-black/75 p-4';
    modal.innerHTML = `
      <div class="song-modal-card relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
                  transform scale-95 opacity-0"
           style="background:linear-gradient(160deg,#0f1f38,#070e1c);border:1px solid rgba(255,255,255,0.1);">

        <!-- Blurred hero image -->
        <div class="absolute inset-0 opacity-20 scale-110 blur-2xl pointer-events-none"
             style="background:url('${thumb}') center/cover no-repeat;"></div>

        <!-- Close -->
        <button class="song-modal-close-btn absolute top-3 right-3 w-8 h-8 flex items-center justify-center
                       rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Artwork -->
        <div class="px-6 pt-8 pb-4 flex justify-center relative">
          <img src="${thumb}" alt="${song.title}"
            class="max-w-full max-h-52 rounded-2xl object-contain shadow-2xl ring-2 ring-white/10"
            style="max-height:208px;width:auto;height:auto;"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22176%22 height=%22176%22><rect width=%22176%22 height=%22176%22 fill=%22%23374151%22 rx=%2216%22/><text x=%2288%22 y=%22108%22 text-anchor=%22middle%22 font-size=%2264%22>🎵</text></svg>'"
          />
        </div>

        <!-- Info -->
        <div class="px-6 pb-2 text-center">
          <h2 class="text-white font-display font-700 text-xl leading-tight">${song.title}</h2>
          <p class="text-gray-400 text-sm mt-1">${artists}</p>
        </div>

        <!-- Mood tags -->
        ${moods.length ? `
        <div class="px-6 py-3 flex flex-wrap justify-center gap-1.5">
          ${moods.map(m => {
            const mood = MOODS.find(x => x.id === m);
            return `<span class="text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-300">
              ${mood ? mood.emoji + ' ' + mood.label : m}
            </span>`;
          }).join('')}
        </div>` : ''}

        <!-- Actions -->
        <div class="px-6 pb-6 pt-2 flex gap-2">
          ${playlistIdx >= 0 ? `
          <button class="song-modal-play-now flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                         bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40
                         text-cyan-300 text-sm font-medium transition-all border border-cyan-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            Play
          </button>` : ''}
          <button class="song-modal-add-pl flex-1 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30
                         text-cyan-400 text-sm font-medium transition-colors">
            + Playlist
          </button>
          <button class="song-modal-fav w-11 flex items-center justify-center rounded-xl transition-colors
            ${isFav ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-rose-400'}">
            ${isFav
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`}
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Animate in (double rAF ensures layout is committed before transition)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = modal.querySelector('.song-modal-card');
      if (card) {
        card.style.transition = 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease';
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
      }
    }));

    // Backdrop + close button
    modal.addEventListener('click', (e) => { if (e.target === modal) SongModal.close(); });
    modal.querySelector('.song-modal-close-btn')?.addEventListener('click', SongModal.close);

    // Play Now button (only shown when opened via long-press with a valid playlist index)
    modal.querySelector('.song-modal-play-now')?.addEventListener('click', () => {
      SongModal.close();
      if (playlistIdx >= 0) Playlist.playAt(playlistIdx);
    });

    // Add to Playlist
    // IMPORTANT: SongModal.close() runs a 200ms fade-out animation — the modal
    // element stays in the DOM at z-[70] during that time. If showAddModal fires
    // immediately, its z-50 panel is hidden behind the still-visible closing overlay.
    // Fix: capture song before close removes it, then wait 220ms.
    modal.querySelector('.song-modal-add-pl')?.addEventListener('click', () => {
      const songRef = { ...song }; // snapshot — modal.remove() will GC the closure's song
      SongModal.close();
      setTimeout(() => UserPlaylists.showAddModal(songRef), 220);
    });

    // Favorite toggle — reopen to reflect new state
    modal.querySelector('.song-modal-fav')?.addEventListener('click', () => {
      Favorites.toggle(song);
      SongModal.open(song);
    });

    // Escape key — scoped listener that cleans itself up
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        SongModal.close();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);
  },

  close() {
    // Handle both possible modal IDs for a clean transition
    ['song-detail-modal', 'song-card-modal'].forEach(id => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const card = modal.querySelector('.song-modal-card');
      if (card) {
        card.style.transition = 'transform 0.18s ease, opacity 0.15s ease';
        card.classList.add('scale-95', 'opacity-0');
      }
      setTimeout(() => modal.remove(), 200);
    });
  }
};

// ═══════════════════════════════════════════════════════════
// 12. TOAST SYSTEM — stacked, animated, swipeable
// ═══════════════════════════════════════════════════════════

const Toast = {
  _queue:   [],     // pending toasts
  _active:  [],     // currently shown toasts (max 3)
  _MAX:     3,      // max simultaneous toasts
  _GAP:     8,      // px gap between stacked toasts

  /** Show a toast notification. Queues if max active. */
  show(message, type = 'info') {
    console.log(`[Toast] show [${type}]:`, message);

    const colors = {
      success: { bg: 'rgba(16,185,129,0.93)',  icon: '✓', border: 'rgba(16,185,129,0.4)' },
      error:   { bg: 'rgba(239,68,68,0.93)',   icon: '✕', border: 'rgba(239,68,68,0.4)' },
      warning: { bg: 'rgba(245,158,11,0.93)',  icon: '⚠', border: 'rgba(245,158,11,0.4)' },
      info:    { bg: 'rgba(59,130,246,0.93)',  icon: 'ℹ', border: 'rgba(59,130,246,0.4)' },
    };
    const style = colors[type] || colors.info;

    // Dedup: if an identical toast is already showing, ignore
    if (Toast._active.some(t => t._meta?.message === message)) return;

    const entry = { message, type, style };

    if (Toast._active.length >= Toast._MAX) {
      // Queue for later
      Toast._queue.push(entry);
      return;
    }

    Toast._show(entry);
  },

  _show(entry) {
    const PLAYER_H   = getComputedStyle(document.documentElement).getPropertyValue('--player-h').trim() || '5.5rem';
    const TOAST_H    = 48;
    const stackIdx   = Toast._active.length;     // 0 = bottom, 1 = above, etc.
    const bottomBase = `calc(${PLAYER_H} + 1rem)`;

    const toast = document.createElement('div');
    toast.className = 'sa-toast';
    toast._meta = entry;

    toast.style.cssText = `
      position: fixed;
      right: 1rem;
      bottom: calc(${PLAYER_H} + 1rem + ${stackIdx * (TOAST_H + Toast._GAP)}px);
      z-index: 210;
      min-width: 200px; max-width: 320px;
      padding: 11px 14px;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      background: ${entry.style.bg};
      border: 1px solid ${entry.style.border};
      box-shadow: 0 8px 28px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      gap: 9px;
      transform: translateX(110%) scale(0.95);
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, bottom 0.2s ease;
      will-change: transform;
      cursor: default;
      overflow: hidden;
    `;

    // Progress bar at bottom
    const prog = document.createElement('div');
    prog.style.cssText = `
      position: absolute; bottom: 0; left: 0;
      height: 2px; width: 100%;
      background: rgba(255,255,255,0.4);
      border-radius: 0 0 12px 12px;
      transform-origin: left;
      animation: toastProgress 3.2s linear forwards;
    `;
    toast.innerHTML = `<span style="flex-shrink:0;font-size:14px">${entry.style.icon}</span><span style="flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${entry.message}</span>`;
    toast.appendChild(prog);

    // Swipe-to-dismiss
    let startX = 0;
    toast.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    toast.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - startX;
      if (dx > 20) toast.style.transform = `translateX(${dx}px)`;
    }, { passive: true });
    toast.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 80) Toast._remove(toast);
      else { toast.style.transition = 'transform 0.2s ease'; toast.style.transform = 'translateX(0)'; }
    }, { passive: true });

    document.body.appendChild(toast);
    Toast._active.push(toast);

    // Animate in
    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0) scale(1)';
    }));

    // Auto-dismiss after 3.4s
    toast._timer = setTimeout(() => Toast._remove(toast), 3400);
  },

  _remove(toast) {
    if (!toast || !document.body.contains(toast)) return;
    clearTimeout(toast._timer);
    toast.style.transition = 'transform 0.22s ease, opacity 0.18s ease';
    toast.style.transform  = 'translateX(110%) scale(0.95)';
    toast.style.opacity    = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
      Toast._active = Toast._active.filter(t => t !== toast);
      // Reposition remaining toasts
      Toast._restack();
      // Show queued toast if any
      if (Toast._queue.length > 0 && Toast._active.length < Toast._MAX) {
        Toast._show(Toast._queue.shift());
      }
    }, 250);
  },

  _restack() {
    const PLAYER_H = getComputedStyle(document.documentElement).getPropertyValue('--player-h').trim() || '5.5rem';
    const TOAST_H  = 48;
    Toast._active.forEach((t, i) => {
      if (document.body.contains(t)) {
        t.style.bottom = `calc(${PLAYER_H} + 1rem + ${i * (TOAST_H + Toast._GAP)}px)`;
      }
    });
  },

  /** Legacy compat: _destroy clears everything */
  _destroy() {
    [...Toast._active].forEach(t => Toast._remove(t));
    Toast._queue = [];
  }
};

// ═══════════════════════════════════════════════════════════
// 12b. LOADING TOAST — animated progress indicator for song loads
//
//  Shows immediately on song click with a pseudo-progress bar
//  that ramps from 0→90% over ~2.5s, then jumps to 100% when
//  the audio actually starts playing.
//  This makes every click feel instant and the system alive.
// ═══════════════════════════════════════════════════════════

const LoadingToast = {
  _el:        null,
  _bar:       null,
  _label:     null,
  _pctEl:     null,
  _raf:       null,
  _maxTimer:  null,   // safety: force-dismiss after MAX_LIFE ms no matter what
  _dimTimer:  null,   // dismiss delay timers (complete/error)
  _start:     0,
  _duration:  2500,   // ms to reach 90%
  _pct:       0,
  MAX_LIFE:   8000,   // absolute max toast lifetime (ms)

  /** Show loading toast for a song. Always clears any previous toast from DOM first. */
  show(songTitle) {
    // ── CRITICAL: always nuke existing DOM element immediately ──
    // _clear() only nulls JS refs — it does NOT remove the DOM node.
    // We must remove it here so old toasts never get orphaned.
    LoadingToast._forceRemoveDom();
    LoadingToast._clearTimers();

    const el = document.createElement('div');
    el.id = 'loading-toast';
    el.style.cssText = `
      position:fixed; bottom:calc(var(--player-h) + 1rem); right:1rem;
      z-index:210; min-width:220px; max-width:300px;
      background:rgba(9,17,30,0.95); border:1px solid rgba(6,182,212,0.3);
      border-radius:14px; padding:10px 14px; box-shadow:0 6px 24px rgba(0,0,0,0.5);
      backdrop-filter:blur(16px); transform:translateX(110%);
      transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
      font-family:'DM Sans',sans-serif;
    `;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px;">
        <div id="lt-spinner" style="width:14px;height:14px;border:2px solid rgba(6,182,212,0.3);
          border-top-color:var(--theme-accent);border-radius:50%;
          animation:ltSpin 0.75s linear infinite;flex-shrink:0;"></div>
        <span id="lt-label" style="font-size:11px;font-weight:600;color:#f0f6ff;
          overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;">
          Loading…
        </span>
        <span id="lt-pct" style="font-size:10px;color:var(--theme-accent);font-variant-numeric:tabular-nums;
          font-weight:700;flex-shrink:0;margin-right:4px;">0%</span>
        <button id="lt-close" style="background:none;border:none;color:rgba(255,255,255,0.5);
          cursor:pointer;padding:0;font-size:13px;line-height:1;flex-shrink:0;
          transition:color 0.1s" aria-label="Dismiss">✕</button>
      </div>
      <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
        <div id="lt-bar" style="height:100%;width:0%;border-radius:999px;
          background:linear-gradient(90deg,var(--theme-accent),var(--theme-accent2));
          transition:width 0.12s ease;"></div>
      </div>`;

    document.body.appendChild(el);
    LoadingToast._el    = el;
    LoadingToast._bar   = el.querySelector('#lt-bar');
    LoadingToast._label = el.querySelector('#lt-label');
    LoadingToast._pctEl = el.querySelector('#lt-pct');

    // Close button — always lets user dismiss manually
    el.querySelector('#lt-close')?.addEventListener('click', () => LoadingToast._dismiss());

    // Shorten title to fit
    const shortTitle = songTitle && songTitle.length > 28
      ? songTitle.slice(0, 26) + '…'
      : (songTitle || 'Song');
    LoadingToast._label.textContent = shortTitle;

    // Animate in after next paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
    }));

    // Start pseudo-progress
    LoadingToast._pct   = 0;
    LoadingToast._start = performance.now();
    LoadingToast._tick();

    // Safety net: no matter what, dismiss after MAX_LIFE ms
    // Handles cases where complete()/error() never fire (e.g. song switch mid-load)
    LoadingToast._maxTimer = setTimeout(() => LoadingToast._dismiss(), LoadingToast.MAX_LIFE);
  },

  /** Animate pseudo-progress from 0 → 90% over _duration ms */
  _tick() {
    if (!LoadingToast._el) return;
    const elapsed = performance.now() - LoadingToast._start;
    const raw = Math.min(elapsed / LoadingToast._duration, 1);
    const pct  = Math.round(90 * (1 - Math.pow(1 - raw, 2.4)));
    LoadingToast._setBar(pct);
    if (pct < 90) {
      LoadingToast._raf = requestAnimationFrame(LoadingToast._tick);
    }
  },

  _setBar(pct) {
    LoadingToast._pct = pct;
    if (LoadingToast._bar)   LoadingToast._bar.style.width  = `${pct}%`;
    if (LoadingToast._pctEl) LoadingToast._pctEl.textContent = `${pct}%`;
  },

  /** Called when audio actually starts playing — jump to 100% and auto-dismiss */
  complete() {
    const el = LoadingToast._el;
    if (!el) return;
    cancelAnimationFrame(LoadingToast._raf);
    LoadingToast._raf = null;
    LoadingToast._setBar(100);
    // Swap spinner for checkmark
    const spinner = el.querySelector('#lt-spinner');
    if (spinner) {
      spinner.style.animation = 'none';
      spinner.style.border    = '2px solid #10b981';
      spinner.innerHTML       = '<svg viewBox="0 0 12 12" fill="none" stroke="#10b981" stroke-width="2.5" width="10" height="10"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>';
      spinner.style.display   = 'flex';
      spinner.style.alignItems = 'center';
      spinner.style.justifyContent = 'center';
    }
    if (LoadingToast._label) LoadingToast._label.style.color = '#10b981';
    LoadingToast._dimTimer = setTimeout(() => LoadingToast._dismiss(), 450);
  },

  /** Called on load error — show red state then dismiss */
  error() {
    const el = LoadingToast._el;
    if (!el) return;
    cancelAnimationFrame(LoadingToast._raf);
    LoadingToast._raf = null;
    LoadingToast._setBar(LoadingToast._pct); // freeze where it is
    if (LoadingToast._label) {
      LoadingToast._label.textContent = 'Load failed';
      LoadingToast._label.style.color = '#f87171';
    }
    if (LoadingToast._pctEl) LoadingToast._pctEl.textContent = '✕';
    LoadingToast._dimTimer = setTimeout(() => LoadingToast._dismiss(), 1200);
  },

  /**
   * _dismiss — always works even if refs were cleared.
   * Finds the DOM element by ID as fallback so it ALWAYS gets removed.
   */
  _dismiss() {
    LoadingToast._clearTimers();
    // Prefer stored ref; fall back to DOM lookup so orphaned toasts are caught too
    const el = LoadingToast._el || document.getElementById('loading-toast');
    LoadingToast._el = LoadingToast._bar = LoadingToast._label = LoadingToast._pctEl = null;
    if (!el) return;
    el.style.transform = 'translateX(110%)';
    setTimeout(() => { if (el.parentNode) el.remove(); }, 280);
  },

  /** Remove any loading-toast DOM node that may be orphaned */
  _forceRemoveDom() {
    const existing = document.getElementById('loading-toast');
    if (existing) existing.remove();
  },

  /** Cancel all pending timers + RAF */
  _clearTimers() {
    cancelAnimationFrame(LoadingToast._raf);
    LoadingToast._raf = null;
    if (LoadingToast._maxTimer) { clearTimeout(LoadingToast._maxTimer); LoadingToast._maxTimer = null; }
    if (LoadingToast._dimTimer) { clearTimeout(LoadingToast._dimTimer); LoadingToast._dimTimer = null; }
  },

  /** Legacy alias used in some paths */
  _clear() {
    LoadingToast._clearTimers();
    LoadingToast._el = LoadingToast._bar = LoadingToast._label = LoadingToast._pctEl = null;
  }
};

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// 13b. FAILURE LOGGING
// ═══════════════════════════════════════════════════════════

const FailureLog = {
  MAX: 100,

  add(song, errorReason) {
    try {
      const logs = FailureLog.get();
      logs.unshift({
        title:    song?.title  || 'Unknown',
        artist:   Array.isArray(song?.artist) ? song.artist.join(', ') : (song?.artist || 'Unknown'),
        audioUrl: song ? DataLoader.getAudioUrl(song) : '',
        reason:   String(errorReason),
        time:     new Date().toISOString(),
      });
      Storage.save('failLog', logs.slice(0, FailureLog.MAX));
      console.warn('[FailLog]', song?.title, errorReason);
    } catch { /* never crash on logging */ }
  },

  get() {
    return Storage.load('failLog', []);
  },

  clear() {
    Storage.save('failLog', []);
  }
};

// ═══════════════════════════════════════════════════════════
// 13c. SONG DOWNLOADER
// ═══════════════════════════════════════════════════════════

const Downloader = {
  async download(song) {
    if (!song) return;
    const url = DataLoader.getAudioUrl(song);
    if (!url) return Toast.show('No audio URL available', 'error');

    const artists = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || 'Unknown');
    const fileName = `${song.title} - ${artists}.mp3`
      .replace(/[/\\?%*:|"<>]/g, '-'); // sanitise filename

    Toast.show('⬇️ Starting download…', 'info');

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const total = parseInt(resp.headers.get('Content-Length') || '0');
      const reader = resp.body.getReader();
      const chunks = [];
      let received = 0;

      // Show progress in toast area
      const progressId = 'dl-progress-toast';
      let progEl = document.getElementById(progressId);
      if (!progEl) {
        progEl = document.createElement('div');
        progEl.id = progressId;
        progEl.className = 'fixed bottom-36 right-4 z-[200] px-4 py-3 rounded-xl text-white text-xs font-medium bg-gray-800/90 shadow-xl w-52';
        document.body.appendChild(progEl);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) {
          const pct = Math.round((received / total) * 100);
          progEl.textContent = `⬇️ Downloading… ${pct}%`;
        }
      }

      progEl.remove();
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      Toast.show('✅ Download complete!', 'success');
    } catch (err) {
      document.getElementById('dl-progress-toast')?.remove();
      Toast.show('Download failed — check connection', 'error');
      console.error('[Downloader]', err);
    }
  }
};

// ═══════════════════════════════════════════════════════════
// 13d. PLAYLIST IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════

const PlaylistIO = {
  /** Export a named user playlist OR favorites as JSON download */
  export(playlistName) {
    let songs, displayName;
    if (playlistName === '__favorites__') {
      songs = Favorites.getSongs();
      displayName = 'My Favorites';
    } else {
      songs = state.userPlaylists[playlistName];
      displayName = playlistName;
    }
    if (!songs?.length) return Toast.show('Nothing to export', 'warning');

    const payload = {
      name:    displayName,
      version: 1,
      songs:   songs.map(s => ({
        title:    s.title,
        artist:   s.artist,
        image:    s.image || '',
        audioUrl: DataLoader.getAudioUrl(s),
        store:    s.store,
        file:     s.file,
        mood:     s.mood || [],
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${displayName.replace(/[/\\?%*:|"<>]/g, '-')}.soundaura.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    Toast.show(`📦 Exported "${displayName}"`, 'success');
  },

  /** Open a file picker and import a SoundAura playlist JSON */
  import() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.songs || !Array.isArray(data.songs)) throw new Error('Invalid format');

        // Build a unique name
        let name = (data.name || 'Imported Playlist').trim();
        if (state.userPlaylists[name]) name = `${name} (${Date.now()})`;

        // Reconstruct song objects from exported fields
        const songs = data.songs.map(s => normaliseArtists({
          title: s.title,
          artist: s.artist,
          image: s.image || '',
          store: s.store || '',
          file:  s.file  || '',
          mood:  s.mood  || [],
        })).filter(s => s.title && (s.store || s.audioUrl));

        state.userPlaylists[name] = songs;
        Storage.save('playlists', state.userPlaylists);
        UI.renderUserPlaylists();
        Toast.show(`✅ Imported "${name}" (${songs.length} songs)`, 'success');
      } catch (err) {
        Toast.show('Import failed — invalid file', 'error');
        console.error('[PlaylistIO import]', err);
      }
    };
    input.click();
  },

  /** Show the sharing instructions modal */
  showInstructions() {
    const existing = document.getElementById('share-instructions-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'share-instructions-modal';
    modal.className = 'fixed inset-0 z-[80] flex items-center justify-center modal-backdrop bg-black/70 p-4';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-display font-700 text-white text-lg">📤 Playlist Sharing</h3>
          <button class="share-modal-close w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400">✕</button>
        </div>
        <div class="space-y-4 text-sm text-gray-300">
          <div class="bg-white/5 rounded-xl p-4">
            <p class="font-semibold text-white mb-1">📦 Export a playlist</p>
            <p>Open any user playlist → click the <span class="text-cyan-400">⬇ Export</span> button → a <code>.soundaura.json</code> file downloads.</p>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <p class="font-semibold text-white mb-1">📥 Import a playlist</p>
            <p>Click <span class="text-cyan-400">Import Playlist</span> in the sidebar → pick a <code>.soundaura.json</code> file → the playlist is added to your library.</p>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <p class="font-semibold text-white mb-1">🔗 Sharing</p>
            <p>Send the exported JSON file to a friend. They import it on their SoundAura to get the same playlist.</p>
          </div>
        </div>
        <button class="share-modal-close mt-5 w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors">Got it!</button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.share-modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }
};

// ═══════════════════════════════════════════════════════════
// 13e. ABOUT MODAL
// ═══════════════════════════════════════════════════════════

const About = {
  open() {
    const existing = document.getElementById('about-modal');
    if (existing) {
      existing.style.opacity = '0';
      existing.style.transition = 'opacity 0.15s ease';
      setTimeout(() => existing.remove(), 150);
      return;
    }

    const logoSrc = (typeof state !== 'undefined' && !state.isDarkMode)
      ? '/soundaura/navbar_icon/light.png'
      : '/soundaura/navbar_icon/dark.png';

    const modal = document.createElement('div');
    modal.id = 'about-modal';
    modal.className = 'fixed inset-0 z-[80] flex items-center justify-center modal-backdrop bg-black/70 p-4';
    modal.style.cssText = 'opacity:0;transition:opacity 0.2s ease;';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-white/10 rounded-3xl p-7 w-full max-w-sm shadow-2xl text-center
                  transform scale-95"
           style="transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease;opacity:0;">

        <div class="flex justify-center mb-3">
          <img src="${logoSrc}" alt="SoundAura" class="h-14 w-auto object-contain"
            style="filter:drop-shadow(0 2px 12px rgba(6,182,212,0.4));pointer-events:none;"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div style="display:none" class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-lg">
            <svg viewBox="0 0 32 32" class="w-8 h-8"><polygon points="10,8 10,24 24,16" fill="white" opacity="0.95"/></svg>
          </div>
        </div>

        <h2 class="font-display leading-none tracking-wide mb-1"
            style="font-weight:800;font-size:1.5rem;
                   background:linear-gradient(110deg,#67e8f9 0%,#38bdf8 40%,#818cf8 100%);
                   -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
          SoundAura
        </h2>
        <p class="text-gray-500 text-xs mb-5">Emotion-driven music, always.</p>

        <div class="space-y-3 text-left text-sm text-gray-300">
          <div class="flex gap-3 items-start">
            <span class="text-xl mt-0.5">🎭</span>
            <div><p class="text-white font-medium">Mood-based discovery</p><p class="text-gray-500 text-xs">Browse music by emotion — sad, romantic, party, spiritual and more.</p></div>
          </div>
          <div class="flex gap-3 items-start">
            <span class="text-xl mt-0.5">🎛️</span>
            <div><p class="text-white font-medium">10-band Equalizer</p><p class="text-gray-500 text-xs">Real-time Web Audio API processing for studio-quality sound.</p></div>
          </div>
          <div class="flex gap-3 items-start">
            <span class="text-xl mt-0.5">📂</span>
            <div><p class="text-white font-medium">Playlists & Favorites</p><p class="text-gray-500 text-xs">Create, share, and import playlists. Heart songs you love.</p></div>
          </div>
          <div class="flex gap-3 items-start">
            <span class="text-xl mt-0.5">📶</span>
            <div><p class="text-white font-medium">Works offline</p><p class="text-gray-500 text-xs">Service Worker caches assets for seamless listening anywhere.</p></div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-white/5 text-xs text-gray-500">
          Built with ❤️ using Vanilla JS · Web Audio API · Tailwind CSS
        </div>
        <button id="close-about"
          class="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400
                 hover:from-cyan-500/30 hover:to-blue-500/30 text-sm font-medium transition-all">
          Close
        </button>
      </div>`;

    document.body.appendChild(modal);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const card = modal.querySelector('[style*="scale-95"]') || modal.querySelector('.bg-gray-900');
      if (card) { card.style.transform = 'scale(1)'; card.style.opacity = '1'; }
    }));

    const close = () => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 150);
    };
    document.getElementById('close-about')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    const onEsc = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    };
    document.addEventListener('keydown', onEsc);
  }
};

// PopupMiniPlayer removed

// ═══════════════════════════════════════════════════════════
// 13h. COMPACT MODE  (Fallback — same-window mini experience)
//
//  Hides sidebar + song list, leaving only the player bar
//  visible, with a centered "now playing" display above it.
//  Ideal when popup is blocked or user prefers staying in-tab.
// ═══════════════════════════════════════════════════════════

const CompactMode = {
  _active: false,

  enable() {
    if (this._active) return;
    this._active = true;
    document.body.classList.add('compact-mode');
    console.log('[Player] Compact mode enabled');
    // Update the now-playing strip with current song
    CompactMode._syncStrip();
    Storage.save('compactMode', true);
    const btn = document.getElementById('compact-mode-toggle');
    if (btn) btn.textContent = '⬆ Expand View';
    Toast.show('Compact Mode — press Expand to return', 'info');
  },

  disable() {
    if (!this._active) return;
    this._active = false;
    document.body.classList.remove('compact-mode');
    console.log('[Player] Compact mode disabled');
    Storage.save('compactMode', false);
    const btn = document.getElementById('compact-mode-toggle');
    if (btn) btn.textContent = '⬇ Compact Mode';
    // Restore layout — clear any inline display override that may have been set
    const layout = document.getElementById('layout-wrapper');
    if (layout) layout.style.display = '';
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = '';
  },

  toggle() {
    this._active ? CompactMode.disable() : CompactMode.enable();
  },

  /** Sync the now-playing strip above the player */
  _syncStrip() {
    const song = state.currentSongId
      ? state.allSongs.find(s => songId(s) === state.currentSongId)
      : null;

    const thumb   = document.getElementById('compact-art');
    const titleEl = document.getElementById('compact-title');
    const artistEl= document.getElementById('compact-artist');

    if (thumb && song) {
      thumb.src = DataLoader.getThumbnailUrl(song);
      thumb.onerror = () => { thumb.src = ''; };
    }
    if (titleEl)  titleEl.textContent  = song?.title  || 'No song playing';
    if (artistEl) artistEl.textContent = song
      ? (Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '—'))
      : '—';
  },

  /** Called whenever song changes while compact mode is on */
  onSongChange(song) {
    if (!this._active) return;
    CompactMode._syncStrip();
  },

  init() {
    // Expand button inside the compact screen — arrow fn preserves context
    document.getElementById('compact-expand-btn')?.addEventListener('click', () => CompactMode.disable());

    // Compact toggle buttons inside the player bar (mobile + desktop)
    ['compact-toggle-mobile', 'compact-toggle-desktop'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => CompactMode.toggle());
    });

    // Legacy menu toggle
    document.getElementById('compact-mode-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('menu-panel')?.classList.add('hidden');
      CompactMode.toggle();
    });

    // Restore from previous session
    if (Storage.load('compactMode', false)) {
      setTimeout(() => CompactMode.enable(), 200);
    }
  }
};


// MiniPlayer removed

// ═══════════════════════════════════════════════════════════
// 14. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 13i. FUZZY SEARCH ENGINE
//
//  Scores songs against a query using multiple signals:
//  • Exact substring match (highest score)
//  • Word-level partial matches (each query word vs song fields)
//  • Typo tolerance via bigram similarity
//  • Multi-field: title + artist + filename
//  • Mixed artist+title queries, e.g. "tum mohit" → correct song
//
//  Returns songs sorted best-first, threshold-filtered.
// ═══════════════════════════════════════════════════════════

const FuzzySearch = {
  /** Normalise a string: lowercase, remove punctuation, collapse spaces */
  _norm(s) {
    return (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  },

  /** Bigram set of a string */
  _bigrams(s) {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i+1]);
    return set;
  },

  /** Dice coefficient similarity between two strings (0-1) */
  _similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const ba = FuzzySearch._bigrams(a);
    const bb = FuzzySearch._bigrams(b);
    if (!ba.size || !bb.size) return 0;
    let inter = 0;
    ba.forEach(g => { if (bb.has(g)) inter++; });
    return (2 * inter) / (ba.size + bb.size);
  },

  /**
   * Score a single song against the query.
   * Returns a number 0–100; 0 means "don't show".
   */
  _score(song, queryNorm, queryWords) {
    const titleN  = FuzzySearch._norm(song.title);
    const artistN = FuzzySearch._norm(
      Array.isArray(song.artist) ? song.artist.join(' ') : (song.artist || '')
    );
    const fileN   = FuzzySearch._norm(song.file || '');
    const combined = `${titleN} ${artistN}`;

    let score = 0;

    // ── 1. Exact substring in title (very high weight) ──────
    if (titleN.includes(queryNorm)) score += 60;
    else if (artistN.includes(queryNorm)) score += 50;
    else if (combined.includes(queryNorm)) score += 45;

    // ── 2. Word-level partial matches ──────────────────────
    // Each query word earns points for matching any field
    let wordScore = 0;
    queryWords.forEach(w => {
      if (w.length < 2) return;
      if (titleN.includes(w))  wordScore += 12;
      if (artistN.includes(w)) wordScore += 10;
      if (fileN.includes(w))   wordScore += 4;
    });
    score += Math.min(wordScore, 40); // cap word bonus

    // ── 3. Typo tolerance via bigram similarity ──────────────
    // Only run if no exact match found yet
    if (score < 20) {
      const simTitle  = FuzzySearch._similarity(queryNorm, titleN) * 30;
      const simArtist = FuzzySearch._similarity(queryNorm, artistN) * 24;
      // Also compare query against individual title words
      const titleWords = titleN.split(' ');
      let maxWordSim = 0;
      queryWords.forEach(qw => {
        titleWords.forEach(tw => {
          if (qw.length >= 3 && tw.length >= 3) {
            maxWordSim = Math.max(maxWordSim, FuzzySearch._similarity(qw, tw) * 20);
          }
        });
      });
      score += Math.max(simTitle, simArtist, maxWordSim);
    }

    // ── 4. Starts-with bonus ───────────────────────────────
    if (titleN.startsWith(queryNorm) || titleN.startsWith(queryWords[0] || ''))
      score += 10;

    return score;
  },

  /**
   * Filter and rank songs against a query.
   * Returns the sorted results (threshold: score ≥ 8).
   */
  rank(songs, query) {
    const q = FuzzySearch._norm(query);
    if (!q) return songs;
    const words = q.split(' ').filter(w => w.length > 0);

    const scored = songs
      .map(song => ({ song, score: FuzzySearch._score(song, q, words) }))
      .filter(x => x.score >= 8)
      .sort((a, b) => b.score - a.score);

    return scored.map(x => x.song);
  }
};


function bindEvents() {
  // ── Smart Scroll Buttons (Feature 1) ──────────────────────
  // Attach to the song list container, not the page.
  // Show "scroll to top" when user is far from top, "scroll to bottom" vice versa.
  (() => {
    const list = document.getElementById('song-list');
    const topBtn = document.getElementById('scroll-top-btn');
    const botBtn = document.getElementById('scroll-bottom-btn');
    if (!list || !topBtn || !botBtn) return;

    const THRESHOLD = 150; // px scrolled before showing a button

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = list;
      const distFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show "up" button only when scrolled down beyond threshold
      topBtn.classList.toggle('visible', scrollTop > THRESHOLD);
      // Show "down" button only when there's more content below threshold
      botBtn.classList.toggle('visible', distFromBottom > THRESHOLD);
    };

    list.addEventListener('scroll', update, { passive: true });

    topBtn.addEventListener('click', () => {
      list.scrollTo({ top: 0, behavior: 'smooth' });
    });
    botBtn.addEventListener('click', () => {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    });

    // Re-check whenever song list is re-rendered (songs load, playlist changes)
    // We observe mutations on the list to catch these cases
    new MutationObserver(update).observe(list, { childList: true });
  })();

  // ── Save exact position on tab/window close ──
  window.addEventListener('beforeunload', () => {
    if (state.currentSongIndex >= 0) {
      const song = state.currentPlaylist[state.currentSongIndex];
      if (song) {
        Storage.save('lastSong', {
          file: song.file,
          store: song.store,
          timestamp: audioEl.currentTime,
        });
      }
    }
    Storage.save('playbackMode', state.playbackMode);
    Storage.save('volume', state.volume);
    Storage.save('muted', state.isMuted);
  });

  // ── Speed buttons → open speed modal ──
  ['speed-btn-mobile', 'speed-btn-desktop'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.stopPropagation();
      SpeedControl.openModal();
    });
  });

  // ── Speed modal: close button ──
  document.getElementById('close-speed-modal')?.addEventListener('click', SpeedControl.closeModal);

  // ── Speed modal: preset buttons ──
  document.querySelectorAll('.speed-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SpeedControl.set(parseFloat(btn.dataset.rate));
    });
  });

  // ── Speed modal: custom slider (live update, 0.05 step) ──
  const speedModalSlider = document.getElementById('speed-modal-slider');
  if (speedModalSlider) {
    speedModalSlider.addEventListener('input', () => {
      SpeedControl.set(parseFloat(speedModalSlider.value));
    });
  }

  // ── PWA Install banner ──
  document.getElementById('pwa-install-btn')?.addEventListener('click', PWAInstall.install);
  document.getElementById('pwa-install-dismiss')?.addEventListener('click', PWAInstall.dismiss);

  // ── Volume Slider ──
  const volSlider = document.getElementById('volume-slider');
  volSlider?.addEventListener('input', () => {
    Volume.set(parseFloat(volSlider.value));
  });
  // ── Volume Mute Toggle ──
  document.getElementById('volume-icon')?.addEventListener('click', Volume.toggleMute);

  // ── Player Controls (mobile IDs are unprefixed; desktop use -desktop suffix) ──
  const wireBtn = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);
  wireBtn('play-btn',           () => { console.log('[Player] Play/Pause toggled'); AudioEngine.init(); Player.togglePlay(); });
  wireBtn('play-btn-desktop',   () => { console.log('[Player] Play/Pause toggled (desktop)'); AudioEngine.init(); Player.togglePlay(); });
  wireBtn('next-btn',           () => { console.log('[Player] Next song'); Player.next(); });
  wireBtn('next-btn-desktop',   () => { console.log('[Player] Next song (desktop)'); Player.next(); });
  wireBtn('prev-btn',           () => { console.log('[Player] Previous song'); Player.prev(); });
  wireBtn('prev-btn-desktop',   () => { console.log('[Player] Previous song (desktop)'); Player.prev(); });
  wireBtn('skip-fwd-btn',       () => { console.log('[Player] Skip forward 10s'); Player.skip(10); });
  wireBtn('skip-fwd-btn-desktop', () => { console.log('[Player] Skip forward 10s (desktop)'); Player.skip(10); });
  wireBtn('skip-back-btn',      () => { console.log('[Player] Skip back 10s'); Player.skip(-10); });
  wireBtn('skip-back-btn-desktop', () => { console.log('[Player] Skip back 10s (desktop)'); Player.skip(-10); });
  wireBtn('mode-btn',           () => { console.log('[Player] Playback mode cycled'); PlaybackMode.cycle(); });
  wireBtn('mode-btn-desktop',   () => { console.log('[Player] Playback mode cycled (desktop)'); PlaybackMode.cycle(); });

  // ── Expand Mode — Atmosphere Phase 4 ──────────────────────────────
  // Helper: get currently playing song object
  const _expandGetSong = () =>
    state.currentSongId
      ? (state.allSongs.find(s => songId(s) === state.currentSongId) || null)
      : (state.currentPlaylist[state.currentSongIndex] || null);

  const _openExpand = () => {
    if (typeof AtmosphereEngine === 'undefined') return;
    console.log('[Expand] Expand player opened');
    // Ensure analyser is hooked before opening
    if (state.analyser && !AtmosphereEngine.AudioReactive._analyser) {
      AtmosphereEngine.AudioReactive.init(state.analyser);
    }
    AtmosphereEngine.openExpand(_expandGetSong());
  };

  ['expand-mode-btn', 'expand-mode-btn-desktop'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', _openExpand);
  });

  // ── Progress Bar (mobile + desktop, mouse + touch) ──
  const wireProgressBar = (barId, filledId, thumbId) => {
    const bar = document.getElementById(barId);
    if (!bar) return;
    const scrubTo = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
    };
    bar.addEventListener('click', (e) => scrubTo(e.clientX));
    let scrubbing = false;
    bar.addEventListener('mousedown', (e) => { scrubbing = true; scrubTo(e.clientX); });
    document.addEventListener('mousemove', (e) => { if (scrubbing) scrubTo(e.clientX); });
    document.addEventListener('mouseup', () => { scrubbing = false; });
    bar.addEventListener('touchstart', (e) => { e.preventDefault(); scrubTo(e.touches[0].clientX); }, { passive: false });
    bar.addEventListener('touchmove', (e) => { e.preventDefault(); scrubTo(e.touches[0].clientX); }, { passive: false });

    // Wire thumb hover via bar hover class
    bar.addEventListener('mouseenter', () => {
      const t = document.getElementById(thumbId);
      if (t) t.style.opacity = '1';
    });
    bar.addEventListener('mouseleave', () => {
      const t = document.getElementById(thumbId);
      if (t) t.style.opacity = '0';
    });
  };
  wireProgressBar('progress-bar', 'progress-filled', 'progress-thumb');
  wireProgressBar('progress-bar-desktop', 'progress-filled-desktop', 'progress-thumb-desktop');

  // ── Dice (Random) Button — roll animation + throttle ──────────
  // The _randomBusy flag is set inside Playlist.playRandom() for
  // 650 ms so rapid clicks are ignored while a load is in progress.
  // The CSS class 'dice-rolling' drives a 450 ms keyframe animation
  // defined in index.html <style>.
  document.getElementById('dice-btn')?.addEventListener('click', () => {
    // Guard: if a load is already in progress, swallow the click.
    if (Playlist._randomBusy) return;

    const btn = document.getElementById('dice-btn');
    if (btn) {
      // Trigger roll animation immediately for instant visual feedback.
      btn.classList.add('dice-rolling');
      btn.addEventListener('animationend', () => {
        btn.classList.remove('dice-rolling');
      }, { once: true });
    }

    // Small delay lets animation complete before selection highlight appears
    setTimeout(() => {
      console.log('[RandomSong] Dice animation complete, selecting song...');
      Playlist.playRandom();
    }, 300);
  });

  // ── Explore Modal ──
  document.getElementById('explore-btn')?.addEventListener('click', () => { console.log('[Explore] Modal opened'); Explore.open(false); });
  document.getElementById('close-explore')?.addEventListener('click', () => { console.log('[Explore] Modal closed'); Explore.close(); });
  document.getElementById('explore-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('explore-modal')) { console.log('[Explore] Modal closed (backdrop)'); Explore.close(); }
  });
  // Confirm add selected songs
  document.getElementById('confirm-add-selection')?.addEventListener('click', Explore.confirmAddSelected);

  // ── "Add Songs" button (inside playlist view) ──
  document.getElementById('add-songs-btn')?.addEventListener('click', () => {
    if (!state.activePlaylistName) return;
    Explore.open(true);
  });

  // ── 3-Dot Menu ──
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPanel?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => menuPanel?.classList.add('hidden'));
  document.addEventListener('scroll', () => menuPanel?.classList.add('hidden'), { passive: true });

  // ── Theme Toggle ──
  document.getElementById('theme-btn')?.addEventListener('click', UI.toggleTheme);

  // ── EQ Panel Toggle ──
  document.getElementById('eq-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('eq-panel');
    panel?.classList.toggle('hidden');
    menuPanel?.classList.add('hidden');
    if (!state.audioContext) AudioEngine.init();
  });
  document.getElementById('close-eq')?.addEventListener('click', () => {
    document.getElementById('eq-panel')?.classList.add('hidden');
  });
  document.getElementById('eq-reset')?.addEventListener('click', AudioEngine.resetEQ);

  // ── EQ Expand (Feature 3) ──
  document.getElementById('eq-expand-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.audioContext) AudioEngine.init();
    EQPanel.openExpanded();
  });

  // ── EQ Save Preset ──
  document.getElementById('eq-save-preset-btn')?.addEventListener('click', () => {
    const name = prompt('Preset name:');
    if (name) AudioEngine.saveCurrentPreset(name);
  });

  // ── EQ Sliders ──
  document.querySelectorAll('.eq-slider').forEach((slider, i) => {
    slider.addEventListener('input', () => {
      AudioEngine.setEQBand(i, parseFloat(slider.value));
      slider.parentElement.querySelector('.eq-value').textContent = slider.value;
    });
  });

  // ── New Playlist ──
  document.getElementById('new-playlist-btn')?.addEventListener('click', () => {
    const name = prompt('Playlist name:');
    if (name) UserPlaylists.create(name.trim());
  });

  // ── All Songs Button ──
  document.getElementById('all-songs-btn')?.addEventListener('click', () => {
    state.activePlaylistName = null;
    Playlist.loadAll();
    UI.renderUserPlaylists();
    Toast.show('Showing all songs', 'info');
  });

  // ── Favorites Button ──
  document.getElementById('favorites-btn')?.addEventListener('click', () => {
    Favorites.openView();
  });

  // ── Search (fuzzy, intent-aware) ──
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    const songListEl = document.getElementById('song-list');
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const raw = searchInput.value.trim();
        console.log('[Search] Query:', raw || '(cleared)');
        if (!raw) {
          UI.renderSongList(state.currentPlaylist);
        } else {
          // [FIX P-4] Use FuzzySearch for ranking — already correct here.
          const results = FuzzySearch.rank(state.currentPlaylist, raw);
          UI.renderSongList(results);
        }
        // [FIX P-4] Always scroll to top after render so best matches
        // are visible immediately, regardless of prior scroll position.
        if (songListEl) songListEl.scrollTop = 0;
      }, 150);
    });
  }

  // ── Mobile Search (parity with desktop search) ──
  const mobileSearchInput = document.getElementById('search-input-mobile');
  if (mobileSearchInput) {
    const songListEl = document.getElementById('song-list');
    let mobileSearchTimer;
    mobileSearchInput.addEventListener('input', () => {
      clearTimeout(mobileSearchTimer);
      mobileSearchTimer = setTimeout(() => {
        const raw = mobileSearchInput.value.trim();
        if (!raw) {
          UI.renderSongList(state.currentPlaylist);
        } else {
          const results = FuzzySearch.rank(state.currentPlaylist, raw);
          UI.renderSongList(results);
        }
        // [FIX P-4b] Scroll to top on mobile search too
        if (songListEl) songListEl.scrollTop = 0;
      }, 150);
    });
  }

  // ── Mobile Sidebar Toggle ──
  const closeMobileDrawer = () => {
    document.getElementById('mobile-sidebar-overlay')?.classList.add('hidden');
    document.getElementById('mobile-sidebar-drawer')?.classList.add('translate-x-full');
  };
  document.getElementById('mobile-library-btn')?.addEventListener('click', () => {
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const sidebar = document.getElementById('mobile-sidebar-drawer');
    overlay?.classList.remove('hidden');
    sidebar?.classList.remove('translate-x-full');
    syncMobileDrawerPlaylists();
    // Sync fav badge in mobile drawer
    const mobileBadge = document.getElementById('fav-count-badge-mobile');
    if (mobileBadge) mobileBadge.textContent = state.favorites.size || '';
    // Start visualizer on mobile canvas if audio is playing
    AudioEngine.startMobileVisualizer();
  });
  document.getElementById('mobile-sidebar-overlay')?.addEventListener('click', closeMobileDrawer);
  document.getElementById('close-mobile-sidebar')?.addEventListener('click', closeMobileDrawer);

  // Mobile Favorites button
  document.getElementById('favorites-btn-mobile')?.addEventListener('click', () => {
    closeMobileDrawer();
    Favorites.openView();
  });

  // Mobile Import + Share
  document.getElementById('import-playlist-btn-mobile')?.addEventListener('click', () => {
    closeMobileDrawer();
    PlaylistIO.import();
  });
  document.getElementById('share-how-btn-mobile')?.addEventListener('click', () => {
    closeMobileDrawer();
    PlaylistIO.showInstructions();
  });

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    // Close settings modal on Escape
    if (e.key === 'Escape') {
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        Settings.close();
        return;
      }
    }
    // Never intercept Ctrl/Meta combos — let browser handle Ctrl+R, Ctrl+L, etc.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.code) {
      case 'Space':      e.preventDefault(); Player.togglePlay(); break;
      case 'ArrowRight': Player.skip(10); break;
      case 'ArrowLeft':  Player.skip(-10); break;
      case 'KeyN':       Player.next(); break;
      case 'KeyP':       Player.prev(); break;
      case 'KeyM':       PlaybackMode.cycle(); break;
      case 'KeyR':       if (!Playlist._randomBusy) Playlist.playRandom(); break;
    }
  });

  // ── Help Modal ──
  document.getElementById('help-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('help-modal')?.classList.toggle('hidden');
    menuPanel?.classList.add('hidden');
  });
  document.getElementById('close-help')?.addEventListener('click', () => {
    document.getElementById('help-modal')?.classList.add('hidden');
  });

  // ── Settings Modal ──
  document.getElementById('settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPanel?.classList.add('hidden');
    Settings.open();
    console.log('[Settings] Opened from menu');
  });
  document.getElementById('close-settings')?.addEventListener('click', Settings.close);
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) Settings.close();
  });
  // Appearance buttons
  document.getElementById('settings-dark-btn')?.addEventListener('click', () => {
    console.log('[Settings] Dark mode selected');
    if (!state.isDarkMode) {
      UI.toggleTheme();
      Settings._updateModeUI(true);
    }
  });
  document.getElementById('settings-light-btn')?.addEventListener('click', () => {
    console.log('[Settings] Light mode selected');
    if (state.isDarkMode) {
      UI.toggleTheme();
      Settings._updateModeUI(false);
    }
  });
  // Particles buttons
  document.getElementById('settings-particles-on')?.addEventListener('click', () => Settings.applyParticles(true));
  document.getElementById('settings-particles-off')?.addEventListener('click', () => Settings.applyParticles(false));
  // Close settings on Escape key (handled globally below via keyboard handler)

  // ── About Modal (logo click) ──
  document.getElementById('logo-area')?.addEventListener('click', About.open);

  // ── Import Playlist ──
  document.getElementById('import-playlist-btn')?.addEventListener('click', PlaylistIO.import);

  // ── Sharing instructions ──
  document.getElementById('share-how-btn')?.addEventListener('click', PlaylistIO.showInstructions);

  // ── Export current user playlist (delegated via playlist header) ──
  document.getElementById('export-playlist-btn')?.addEventListener('click', () => {
    if (state.activePlaylistName && state.activePlaylistName !== '__favorites__') {
      PlaylistIO.export(state.activePlaylistName);
    } else if (state.activePlaylistName === '__favorites__') {
      PlaylistIO.export('__favorites__');
    } else {
      Toast.show('Open a playlist or Favorites first', 'warning');
    }
  });

  // ── Download currently playing song (also from 3-dot menu) ──
  // IMPORTANT: Use state.currentSongId → look up in allSongs, NOT currentPlaylist,
  // so the download works even when the user has navigated to a different playlist.
  const handleDownloadCurrent = () => {
    const song = state.currentSongId
      ? state.allSongs.find(s => songId(s) === state.currentSongId)
      : null;
    if (song) Downloader.download(song);
    else Toast.show('No song is playing', 'warning');
  };
  document.getElementById('download-current-btn')?.addEventListener('click', handleDownloadCurrent);
  document.getElementById('download-current-btn-menu')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('menu-panel')?.classList.add('hidden');
    handleDownloadCurrent();
  });

  // ── Reload App (3-dot menu) ──
  document.getElementById('reload-app-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('menu-panel')?.classList.add('hidden');
    window.location.reload();
  });

  // ── Content Protection ──
  // Prevent right-click context menu on the whole page
  document.addEventListener('contextmenu', (e) => {
    // Allow on inputs/textareas so browser spellcheck still works
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
  });
  // Prevent drag-start on images (desktop)
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}

// ═══════════════════════════════════════════════════════════
// 15. SERVICE WORKER REGISTRATION
// ═══════════════════════════════════════════════════════════

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/soundaura/sw.js').then(reg => {
    console.log('[SW] Registered:', reg.scope);

    // ── Update detection ──────────────────────────────────────
    // A new SW is "waiting" when it has downloaded but not yet activated
    // (because the old SW is still controlling the page).
    const showUpdateBanner = () => {
      // Avoid showing banner twice
      if (document.getElementById('sw-update-banner')) return;
      const banner = document.createElement('div');
      banner.id = 'sw-update-banner';
      banner.className = 'fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 px-4 py-3 bg-cyan-600 text-white text-sm shadow-2xl';
      banner.innerHTML = `
        <span>✨ New version available!</span>
        <button id="sw-refresh-btn" class="px-4 py-1.5 rounded-full bg-white text-cyan-700 font-semibold text-xs hover:bg-cyan-50 transition-colors">
          Refresh
        </button>`;
      document.body.appendChild(banner);
      document.getElementById('sw-refresh-btn')?.addEventListener('click', () => {
        // Tell the waiting SW to take control immediately
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        // If controllerchange doesn't fire within 3s (edge case), reload anyway
        setTimeout(() => window.location.reload(), 3000);
      });
    };

    // Case 1: update already waiting on page load
    if (reg.waiting) showUpdateBanner();

    // Case 2: new SW installs while page is open
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });
  }).catch(err => console.warn('[SW] Registration failed:', err));

  // When the new SW takes control (after SKIP_WAITING), reload the page
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });
}

// ═══════════════════════════════════════════════════════════
// 16. INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function init() {
  console.log('[SoundAura] Initializing...');

  // Load persisted state (includes favorites Set)
  Storage.loadAll();

  // Apply theme immediately
  document.documentElement.classList.toggle('dark', state.isDarkMode);
  document.body.classList.toggle('light-mode', !state.isDarkMode);
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.textContent = state.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';

  // Apply saved accent theme
  Settings.applyTheme(state.currentTheme);

  // Apply particles setting
  Settings.applyParticles(state.particlesOn);

  // Set favicon for current theme
  UI.updateFavicon();

  // Load songs
  await DataLoader.loadSongs();

  // Restore last context (mood/singer/playlist/favorites/all) + last song position
  Storage.restoreContext();

  // Render user playlists sidebar + favorites badge
  UI.renderUserPlaylists();
  UI.updatePlaylistMeta();
  Favorites.updateSidebarBadge();

  // Update mode button
  PlaybackMode.updateUI();

  // Bind all event listeners
  bindEvents();

  // Restore volume and speed
  Volume.restore();
  SpeedControl.restore();  // applies rate + updates all speed labels

  // PWA install prompt listener
  PWAInstall.init();

  // Register service worker
  registerServiceWorker();

  // Initialize EQ panel
  EQPanel.initDraggable();
  EQPanel.renderCustomPresets();

  // Initialize Compact Mode
  CompactMode.init();

  // [Atmosphere] Ensure engine is initialised and synced with saved theme/particles
  if (typeof AtmosphereEngine !== 'undefined') {
    AtmosphereEngine.init();
    // Sync particles toggle from persisted setting
    AtmosphereEngine.toggleParticles(state.particlesOn);
    // Sync theme palette
    AtmosphereEngine.onThemeChange();
    console.log('[Atmosphere] Post-init sync complete');
  }

  // Restore EQ slider display values
  const savedEQ = Storage.load('eqSettings');
  if (savedEQ) {
    savedEQ.forEach((val, i) => {
      const slider = document.getElementById(`eq-band-${i}`);
      if (slider) {
        slider.value = val;
        slider.parentElement.querySelector('.eq-value').textContent = Math.round(val);
      }
    });
  }

  console.log('[SoundAura] Ready ✓');
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);
