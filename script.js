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

// Error handler — logs to FailureLog and surfaces in UI
audioEl.onerror = () => {
  const song = state.currentSongIndex >= 0 ? state.currentPlaylist[state.currentSongIndex] : null;
  const reason = audioEl.error ? `MediaError code ${audioEl.error.code}` : 'Unknown error';
  console.error('[Player] Audio failed to load:', audioEl.src, reason);
  FailureLog.add(song, reason);
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

    const draw = () => {
      state.visualizerFrame = requestAnimationFrame(draw);
      state.analyser.getByteFrequencyData(dataArr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = (canvas.width / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (dataArr[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barH, barW - 1, barH);
        x += barW + 1;
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
        const grad = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(1, '#3b82f6');
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
  async loadSongs() {
    try {
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
    // Update state BEFORE audio loads so the UI responds immediately.
    // This eliminates the "did my click work?" feeling.
    state.currentSongIndex = index;
    const song = state.currentPlaylist[index];
    state.currentSongId = songId(song);   // ← lock onto this song's identity

    // Immediately highlight without waiting for audio events
    UI._instantHighlight(index);
    UI.updatePlayerUI(song);

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

  /** Pick a random song, highlight and scroll to it */
  playRandom() {
    if (!state.currentPlaylist.length) return;
    const idx = Math.floor(Math.random() * state.currentPlaylist.length);
    Playlist.playAt(idx);
    UI.scrollToSong(idx);
    Toast.show(`🎲 Playing: ${state.currentPlaylist[idx].title}`, 'info');
  }
};

// ═══════════════════════════════════════════════════════════
// 7. PLAYER CONTROLS
// ═══════════════════════════════════════════════════════════

const Player = {
  /** Load a song into audio element and play */
  loadAndPlay(song, autoplay = true) {
    const url = DataLoader.getAudioUrl(song);
    console.log('[Player] Loading:', song.title);
    console.log('[Player] URL:', url);

    // Stop and reset before loading new source
    audioEl.pause();
    audioEl.src = url;
    audioEl.load();

    // ── SPEED SYNC FIX ──────────────────────────────────────
    // Some browsers (Chrome, Safari) silently reset playbackRate to 1.0 when
    // audioEl.src changes or audioEl.load() is called.
    // Re-apply the saved speed immediately so the NEXT song plays at the
    // correct rate without any desync between UI and audio.
    audioEl.playbackRate = SpeedControl.current;

    if (autoplay) {
      audioEl.play()
        .then(() => {
          // Re-apply after play() as well (belt-and-suspenders for Safari)
          audioEl.playbackRate = SpeedControl.current;
          state.isPlaying = true;
          UI.setPlayPauseIcon(true);
          AudioEngine.resume();
          if (!state.audioContext) AudioEngine.init();
          AudioEngine.startVisualizer();
          Player.preloadNext();
          MediaSession.update(song);
          // Auto-scroll song list to active item
          setTimeout(() => UI.scrollToSong(state.currentSongIndex), 150);
        })
        .catch(e => {
          console.warn('[Player] Playback blocked:', e);
          state.isPlaying = false;
          UI.setPlayPauseIcon(false);
        });
    }
  },

  /** Toggle play / pause */
  togglePlay() {
    if (!state.currentPlaylist.length) return;
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
      });
    } else {
      audioEl.pause();
      state.isPlaying = false;
      UI.setPlayPauseIcon(false);
      AudioEngine.stopVisualizer();
    }
  },

  /** Skip forward/backward N seconds */
  skip(seconds) {
    audioEl.currentTime = Math.min(Math.max(0, audioEl.currentTime + seconds), audioEl.duration || 0);
  },

  /** Play next song */
  next() {
    const idx = Playlist.getNextIndex();
    if (idx === -1) {
      Player.stop();
      return;
    }
    Playlist.playAt(idx, true);
  },

  /** Play previous song */
  prev() {
    // If >3 seconds in, restart current song
    if (audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      return;
    }
    Playlist.playAt(Playlist.getPrevIndex(), true);
  },

  stop() {
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

  /** Preload next song for gapless playback */
  preloadNext() {
    const nextIdx = Playlist.getNextIndex();
    if (nextIdx === -1 || nextIdx === state.currentSongIndex) return;
    const nextSong = state.currentPlaylist[nextIdx];
    if (!nextSong) return;
    if (state.nextAudio) {
      state.nextAudio.src = '';
    }
    state.nextAudio = new Audio();
    state.nextAudio.src = DataLoader.getAudioUrl(nextSong);
    state.nextAudio.preload = 'auto';
    state.nextAudio.load();
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
        `linear-gradient(to right, #06b6d4 ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
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
      `linear-gradient(to right, #06b6d4 ${pct}%, rgba(255,255,255,0.12) ${pct}%)`;
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
      btn.classList.toggle('text-cyan-400', state.playbackMode !== 'none');
      btn.classList.toggle('text-gray-500', state.playbackMode === 'none');
    });
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
            ${isActive ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 active-song' : 'hover:bg-white/5 border border-transparent'}"
          data-index="${playlistIdx}"
          data-song-id="${id}"
          ${inUserPlaylist ? `draggable="true" data-drag-index="${i}"` : ''}
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
                  <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:60%;animation-delay:0s"></span>
                  <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:100%;animation-delay:0.15s"></span>
                  <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:70%;animation-delay:0.3s"></span>
                </div>
              </div>` : ''}
          </div>
          <div class="flex-1 min-w-0">
            <p class="song-title font-medium text-sm truncate ${isActive ? 'text-cyan-400' : 'text-white'}">${song.title}</p>
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
              : `<button class="add-btn w-7 h-7 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 flex items-center justify-center text-sm transition-colors" data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}' title="Add to playlist">+</button>`
            }
            <!-- Download button -->
            <button class="dl-btn w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition-all"
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
      let longPressTimer = null;
      el.addEventListener('touchstart', (e) => {
        if (e.target.closest('.add-btn, .remove-btn, .song-ctx-btn, .drag-handle, .fav-btn, .dl-btn')) return;
        longPressTimer = setTimeout(() => {
          const idx = parseInt(el.dataset.index);
          if (idx < 0) return;
          const song = state.currentPlaylist[idx];
          if (song) {
            if (navigator.vibrate) navigator.vibrate(30);
            SongModal.open(song, idx);
          }
        }, 500);
      }, { passive: true });
      el.addEventListener('touchend',   () => { clearTimeout(longPressTimer); longPressTimer = null; }, { passive: true });
      el.addEventListener('touchmove',  () => { clearTimeout(longPressTimer); longPressTimer = null; }, { passive: true });
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
      el.classList.toggle('from-cyan-500/20', isActive);
      el.classList.toggle('to-blue-500/10', isActive);
      el.classList.toggle('border-cyan-500/30', isActive);
      el.classList.toggle('active-song', isActive);
      el.classList.toggle('hover:bg-white/5', !isActive);
      el.classList.toggle('border-transparent', !isActive);
      // Update title colour
      const titleEl = el.querySelector('.song-title');
      if (titleEl) {
        titleEl.classList.toggle('text-cyan-400', isActive);
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
              <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:60%;animation-delay:0s"></span>
              <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:100%;animation-delay:0.15s"></span>
              <span class="bar w-1 bg-cyan-400 rounded-full animate-bounce" style="height:70%;animation-delay:0.3s"></span>
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
      el.onclick = () => SongModal.open(song);
    };

    set('player-title',  song.title);
    set('player-artist', artists);
    setThumb('player-thumb');

    set('player-title-desktop',  song.title);
    set('player-artist-desktop', artists);
    setThumb('player-thumb-desktop');

    document.title = `♪ ${song.title} – SoundAura`;
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
    // Spin the disc thumbnails while playing
    ['player-thumb', 'player-thumb-desktop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('disc-spin', playing);
    });
  },

  /** Toggle dark / light theme */
  toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.classList.toggle('dark', state.isDarkMode);
    document.body.classList.toggle('light-mode', !state.isDarkMode);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = state.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    Storage.save('darkMode', state.isDarkMode);
    UI.updateFavicon();
    console.log('[Theme] Switched to', state.isDarkMode ? 'dark' : 'light');
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

  /** Initialize drag & drop for user playlist reordering */
  initDragDrop(container) {
    const items = container.querySelectorAll('[draggable="true"]');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        state.dragSrcIndex = parseInt(item.dataset.dragIndex);
        item.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => item.classList.remove('opacity-50'));
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('ring-1', 'ring-cyan-400');
      });
      item.addEventListener('dragleave', () => item.classList.remove('ring-1', 'ring-cyan-400'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('ring-1', 'ring-cyan-400');
        const destIdx = parseInt(item.dataset.dragIndex);
        if (state.dragSrcIndex !== null && state.dragSrcIndex !== destIdx) {
          const playlist = state.userPlaylists[state.activePlaylistName];
          const moved = playlist.splice(state.dragSrcIndex, 1)[0];
          playlist.splice(destIdx, 0, moved);
          state.currentPlaylist = [...playlist];
          Storage.save('playlists', state.userPlaylists);
          // ── Resync currentSongIndex so highlight stays with the correct song ──
          if (state.currentSongId) {
            state.currentSongIndex = state.currentPlaylist.findIndex(
              s => songId(s) === state.currentSongId
            );
          }
          UI.renderSongList();
        }
        state.dragSrcIndex = null;
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
        ${state.activePlaylistName === name ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300'}"
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

    container.querySelectorAll('.mood-card').forEach(btn => {
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
          <div class="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0">
            <img src="${imgPath}" alt="${singer}"
              class="w-full h-full object-cover"
              onerror="this.style.display='none';this.nextSibling.style.display='flex'"
            />
            <span class="text-sm font-bold text-cyan-400 hidden items-center justify-center w-full h-full">${initials}</span>
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
            lbl.classList.toggle('bg-cyan-500/15', cb.checked);
            lbl.classList.toggle('border-cyan-500/30', cb.checked);
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

    // Live search
    sel.querySelector('#sel-search')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = q
        ? songs.filter(s =>
            s.title.toLowerCase().includes(q) ||
            (Array.isArray(s.artist) ? s.artist.join(' ') : s.artist || '').toLowerCase().includes(q)
          )
        : songs;
      renderList(filtered);
    });

    // Select All button
    sel.querySelector('#sel-all-btn')?.addEventListener('click', () => {
      const allChecked = songs.every(s => state.selectedSongs.has(DataLoader.getAudioUrl(s)));
      songs.forEach(s => {
        const url = DataLoader.getAudioUrl(s);
        if (allChecked) state.selectedSongs.delete(url);
        else state.selectedSongs.add(url);
      });
      const q = sel.querySelector('#sel-search')?.value.trim().toLowerCase() || '';
      const filtered = q ? songs.filter(s => s.title.toLowerCase().includes(q)) : songs;
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

    // Read current slider values
    const currentVals = EQ_BANDS.map((_, i) => {
      const s = document.getElementById(`eq-band-${i}`);
      return s ? parseFloat(s.value) : 0;
    });

    const freqLabels = ['31 Hz','62 Hz','125 Hz','250 Hz','500 Hz','1 kHz','2 kHz','4 kHz','8 kHz','16 kHz'];
    const groupLabels = ['Sub','Bass','Low-Mid','Mid','High-Mid','Presence','Air'];
    // Map of which band index belongs to which group for visual grouping
    const groups = [
      { label: 'SUB BASS', bands: [0,1], color: '#8b5cf6' },
      { label: 'BASS',     bands: [2,3], color: '#06b6d4' },
      { label: 'MID',      bands: [4,5,6], color: '#10b981' },
      { label: 'HIGH',     bands: [7,8,9], color: '#f59e0b' },
    ];

    const modal = document.createElement('div');
    modal.id = 'eq-expanded-modal';
    modal.className = 'fixed inset-0 z-[80] flex items-end sm:items-center justify-center modal-backdrop bg-black/80 p-0 sm:p-4';
    modal.innerHTML = `
      <div class="w-full sm:max-w-2xl bg-gray-950 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
           style="max-height:92dvh;display:flex;flex-direction:column;">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-lg">🎛️</span>
            <h2 class="font-display font-700 text-white">Equalizer</h2>
          </div>
          <div class="flex items-center gap-2">
            <button id="eq-exp-reset" class="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors">Reset All</button>
            <button id="eq-exp-save"  class="text-xs px-3 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors">💾 Save Preset</button>
            <button id="eq-exp-close" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- EQ sliders — scrollable -->
        <div class="flex-1 overflow-y-auto p-5">
          <!-- Frequency sliders grid -->
          <div class="flex items-end justify-between gap-2 mb-6" style="height:180px;">
            ${EQ_BANDS.map((band, i) => {
              const val = currentVals[i];
              const pct = ((val + 12) / 24) * 100;
              return `
              <div class="flex flex-col items-center gap-2 flex-1" data-band="${i}">
                <span class="eq-exp-val text-xs font-mono text-gray-400 tabular-nums" style="min-width:28px;text-align:center">${val > 0 ? '+' : ''}${val}</span>
                <input type="range" class="eq-exp-slider" data-band="${i}"
                  min="-12" max="12" step="0.5" value="${val}"
                  style="writing-mode:vertical-lr;direction:rtl;width:28px;height:130px;cursor:pointer;accent-color:#06b6d4;" />
                <span class="text-xs text-gray-500" style="font-size:10px">${band.label}</span>
              </div>`;
            }).join('')}
          </div>

          <!-- Group labels bar -->
          <div class="flex gap-1 mb-4">
            ${groups.map(g => `
              <div class="flex-none rounded-full px-2.5 py-0.5 text-xs font-medium"
                   style="background:${g.color}20;color:${g.color};flex:${g.bands.length};">
                ${g.label}
              </div>`).join('')}
          </div>

          <!-- Built-in presets row -->
          <div class="border-t border-white/5 pt-4">
            <p class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Presets</p>
            <div class="flex gap-2 flex-wrap">
              <button class="eq-exp-preset text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors" data-preset="flat">Flat</button>
              <button class="eq-exp-preset text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors" data-preset="bass">Bass Boost</button>
              <button class="eq-exp-preset text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors" data-preset="vocal">Vocal</button>
              <button class="eq-exp-preset text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors" data-preset="treble">Treble</button>
            </div>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Close handlers
    const close = () => modal.remove();
    modal.querySelector('#eq-exp-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    // Slider input — sync to main panel + audio engine
    modal.querySelectorAll('.eq-exp-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const i = parseInt(slider.dataset.band);
        const val = parseFloat(slider.value);
        // Update the value display
        const valEl = slider.closest('[data-band]').querySelector('.eq-exp-val');
        if (valEl) valEl.textContent = (val > 0 ? '+' : '') + val;
        // Sync to compact panel
        const compact = document.getElementById(`eq-band-${i}`);
        if (compact) {
          compact.value = val;
          compact.parentElement.querySelector('.eq-value').textContent = val;
        }
        // Apply to audio
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
      if (name) AudioEngine.saveCurrentPreset(name);
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
                 focus:outline-none focus:border-cyan-500/60 transition-colors mb-3" />
        <div class="flex gap-2">
          <button id="rename-pl-confirm" class="flex-1 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors">Rename</button>
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
            class="w-44 h-44 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
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
// 12. TOAST SYSTEM — single toast at a time
// ═══════════════════════════════════════════════════════════

const Toast = {
  _timer: null,
  _current: null,

  show(message, type = 'info') {
    const colors = {
      success: 'bg-emerald-500/90',
      error:   'bg-red-500/90',
      warning: 'bg-amber-500/90',
      info:    'bg-blue-500/90'
    };

    // Remove any existing toast immediately
    if (Toast._current) {
      Toast._current.remove();
      Toast._current = null;
    }
    if (Toast._timer) {
      clearTimeout(Toast._timer);
      Toast._timer = null;
    }

    const toast = document.createElement('div');
    toast.id = 'soundaura-toast';
    toast.className = `fixed bottom-28 right-4 z-[200] px-4 py-3 rounded-xl text-white text-sm
      font-medium shadow-xl ${colors[type] || colors.info} backdrop-blur-sm
      transform transition-all duration-250 translate-x-full`;
    toast.textContent = message;
    document.body.appendChild(toast);
    Toast._current = toast;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full');
    }));

    Toast._timer = setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => { toast.remove(); Toast._current = null; }, 280);
      Toast._timer = null;
    }, 2400);
  }
};

// ═══════════════════════════════════════════════════════════
// 13. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

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
      // Animate out then remove
      existing.style.opacity = '0';
      existing.style.transition = 'opacity 0.15s ease';
      setTimeout(() => existing.remove(), 150);
      return;
    }

    // Use same logo path as navbar (theme-aware)
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

        <!-- Theme-aware logo — identical to navbar -->
        <div class="flex justify-center mb-3">
          <img
            id="about-modal-logo"
            src="${logoSrc}"
            alt="SoundAura logo"
            class="h-14 w-auto object-contain"
            style="filter:drop-shadow(0 2px 12px rgba(6,182,212,0.4));pointer-events:none;"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          />
          <!-- Fallback if image fails to load -->
          <div style="display:none" class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-lg">
            <svg viewBox="0 0 32 32" class="w-8 h-8"><polygon points="10,8 10,24 24,16" fill="white" opacity="0.95"/></svg>
          </div>
        </div>

        <!-- Title: exact same gradient + font as #navbar-title -->
        <h2 class="font-display leading-none tracking-wide mb-1"
            style="font-weight:800;font-size:1.5rem;
                   background:linear-gradient(110deg,#67e8f9 0%,#38bdf8 40%,#818cf8 100%);
                   -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                   background-clip:text;">
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

    // Animate in (double rAF so transition fires after paint)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const card = modal.querySelector('[style*="scale-95"]') ||
                   modal.querySelector('.bg-gray-900');
      if (card) {
        card.style.transform = 'scale(1)';
        card.style.opacity   = '1';
      }
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

// ═══════════════════════════════════════════════════════════
// 14. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

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
  wireBtn('play-btn',           () => { AudioEngine.init(); Player.togglePlay(); });
  wireBtn('play-btn-desktop',   () => { AudioEngine.init(); Player.togglePlay(); });
  wireBtn('next-btn',           Player.next);
  wireBtn('next-btn-desktop',   Player.next);
  wireBtn('prev-btn',           Player.prev);
  wireBtn('prev-btn-desktop',   Player.prev);
  wireBtn('skip-fwd-btn',       () => Player.skip(10));
  wireBtn('skip-fwd-btn-desktop', () => Player.skip(10));
  wireBtn('skip-back-btn',      () => Player.skip(-10));
  wireBtn('skip-back-btn-desktop', () => Player.skip(-10));
  wireBtn('mode-btn',           PlaybackMode.cycle);
  wireBtn('mode-btn-desktop',   PlaybackMode.cycle);

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

  // ── Dice (Random) Button ──
  document.getElementById('dice-btn')?.addEventListener('click', Playlist.playRandom);

  // ── Explore Modal ──
  document.getElementById('explore-btn')?.addEventListener('click', () => Explore.open(false));
  document.getElementById('close-explore')?.addEventListener('click', Explore.close);
  document.getElementById('explore-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('explore-modal')) Explore.close();
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

  // ── Search ──
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          UI.renderSongList(state.currentPlaylist);
          return;
        }
        const filtered = state.currentPlaylist.filter(s =>
          s.title.toLowerCase().includes(q) ||
          (Array.isArray(s.artist) ? s.artist.join(' ') : s.artist).toLowerCase().includes(q)
        );
        UI.renderSongList(filtered);
      }, 200);
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
    // Never intercept Ctrl/Meta combos — let browser handle Ctrl+R, Ctrl+L, etc.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.code) {
      case 'Space':      e.preventDefault(); Player.togglePlay(); break;
      case 'ArrowRight': Player.skip(10); break;
      case 'ArrowLeft':  Player.skip(-10); break;
      case 'KeyN':       Player.next(); break;
      case 'KeyP':       Player.prev(); break;
      case 'KeyM':       PlaybackMode.cycle(); break;
      case 'KeyR':       Playlist.playRandom(); break;
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
