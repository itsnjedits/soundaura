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

const GITHUB_USER = 'itsnjedits';
/**
 * Build audio URL — guards against double Audio/ prefix.
 * songs.json `file` field may be just "Song.mp3" OR "Audio/Song.mp3".
 * We normalise to always produce: .../main/Audio/Song.mp3
 */
const AUDIO_URL = (store, file) => {
  const cleanFile = file.startsWith('Audio/') ? file : `Audio/${file}`;
  return encodeURI(`https://raw.githubusercontent.com/${GITHUB_USER}/${store}/main/${cleanFile}`);
};

const MOODS = [
  { id: 'sad', label: 'Sad', emoji: '😢', color: '#3b82f6' },
  { id: 'ghazal', label: 'Ghazal', emoji: '🌙', color: '#8b5cf6' },
  { id: 'happy', label: 'Happy', emoji: '😊', color: '#f59e0b' },
  { id: 'romantic', label: 'Romantic', emoji: '❤️', color: '#ec4899' },
  { id: 'party', label: 'Party', emoji: '🎉', color: '#f97316' },
  { id: 'punjabi', label: 'Punjabi', emoji: '🥁', color: '#10b981' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥', color: '#ef4444' },
  { id: 'instrumental', label: 'Instrumental', emoji: '🎸', color: '#6366f1' },
  { id: 'slowedreverb', label: 'Slowed+Reverb', emoji: '🌊', color: '#06b6d4' },
  { id: 'oldisgold', label: 'Old is Gold', emoji: '🌟', color: '#d97706' },
  { id: 'meditation', label: 'Meditation', emoji: '🧘', color: '#14b8a6' },
  { id: 'rain', label: 'Rain', emoji: '🌧️', color: '#64748b' },
  { id: 'vocalsonly', label: 'Vocals Only', emoji: '🎤', color: '#a855f7' },
  { id: 'spiritual', label: 'Spiritual', emoji: '✨', color: '#f0a500' },
  { id: 'nostalgia', label: 'Nostalgia', emoji: '📷', color: '#94a3b8' },
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
  none: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
};
const MODE_LABELS = { repeat: 'Repeat Playlist', shuffle: 'Shuffle', loop: 'Loop One', none: 'Play Once' };

// EQ Frequencies for Web Audio API
const EQ_BANDS = [
  { freq: 60, label: '60Hz' },
  { freq: 170, label: '170Hz' },
  { freq: 310, label: '310Hz' },
  { freq: 600, label: '600Hz' },
  { freq: 1000, label: '1kHz' },
  { freq: 3000, label: '3kHz' },
  { freq: 6000, label: '6kHz' },
  { freq: 12000, label: '12kHz' },
  { freq: 14000, label: '14kHz' },
  { freq: 16000, label: '16kHz' },
];

// ═══════════════════════════════════════════════════════════
// 2. STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const state = {
  allSongs: [],              // Full song library from JSON
  currentPlaylist: [],       // Songs shown in main list
  userPlaylists: {},         // { name: [songs] }
  activePlaylistName: null,  // Which user playlist is active

  currentSongIndex: -1,      // Index in currentPlaylist
  isPlaying: false,
  playbackMode: 'repeat',    // repeat | shuffle | loop | none
  shuffleQueue: [],          // Remaining songs for shuffle mode
  shufflePlayed: [],         // Already played in this shuffle round

  currentFilter: null,       // { type: 'mood'|'singer', value: string }
  isDarkMode: true,
  volume: 1.0,               // 0.0 – 1.0
  isMuted: false,            // mute toggle

  // "Add Songs" selection mode
  addSongsMode: false,       // true when Explore is opened from a playlist's "Add Songs"
  selectionPool: [],         // Songs shown in selection mode
  selectedSongs: new Set(),  // audio URLs of selected songs

  // Audio
  audioContext: null,
  analyser: null,
  eqFilters: [],
  pitchNode: null,
  currentSource: null,
  gainNode: null,

  // Preload
  nextAudio: null,           // Preloaded next song element
  dragSrcIndex: null,        // Drag & drop state

  visualizerFrame: null,     // requestAnimationFrame handle
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
      if (ctx.type === 'playlist' && ctx.value && state.userPlaylists[ctx.value]) {
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
        const url  = DataLoader.getAudioUrl(song);
        audioEl.src = url;
        audioEl.load();
        // Seek once metadata is ready — don't auto-play
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

// Error handler — surfaced in UI so user knows what failed
audioEl.onerror = () => {
  console.error('[Player] Audio failed to load:', audioEl.src);
  Toast.show('⚠️ Song failed to load — skipping', 'error');
  // Auto-skip to next song after a short delay
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
    } catch (e) {
      console.warn('[Audio] Web Audio API unavailable:', e);
    }
  },

  /** Resume context after user gesture */
  resume() {
    if (state.audioContext?.state === 'suspended') {
      state.audioContext.resume();
    }
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
  }
};

// ═══════════════════════════════════════════════════════════
// 5. DATA LOADING
// ═══════════════════════════════════════════════════════════

const DataLoader = {
  async loadSongs() {
    try {
      const res = await fetch('songs.json');
      if (!res.ok) throw new Error('Failed to load songs.json');
      state.allSongs = await res.json();
      console.log(`[Data] Loaded ${state.allSongs.length} songs`);
      return state.allSongs;
    } catch (e) {
      console.error('[Data] Error loading songs:', e);
      Toast.show('Could not load songs data', 'error');
      return [];
    }
  },

  /** Filter songs by mood */
  filterByMood(mood) {
    return state.allSongs
      .filter(s => s.mood && s.mood.includes(mood))
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /** Filter songs by artist (partial match) */
  filterByArtist(artist) {
    return state.allSongs
      .filter(s => s.artist && s.artist.some(a => a.toLowerCase().includes(artist.toLowerCase())))
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /** Get audio URL for a song */
  getAudioUrl(song) {
    return AUDIO_URL(song.store, song.file);
  },

  /** Get thumbnail URL with fallback */
  getThumbnailUrl(song) {
    return song.image || 'choice/default_thumb.jpg';
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

  /** Play by index in current playlist */
  playAt(index, fromUserAction = true) {
    if (index < 0 || index >= state.currentPlaylist.length) return;
    state.currentSongIndex = index;
    const song = state.currentPlaylist[index];
    Player.loadAndPlay(song, fromUserAction);
    UI.highlightCurrentSong();
    UI.updatePlayerUI(song);
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

    if (autoplay) {
      audioEl.play()
        .then(() => {
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

  /** Sync slider + icon to current state */
  updateUI() {
    const slider = document.getElementById('volume-slider');
    const icon   = document.getElementById('volume-icon');
    const vol    = state.isMuted ? 0 : state.volume;
    if (slider) slider.value = vol;
    if (icon)   icon.innerHTML = Volume.iconSVG(vol);
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

// ─── Audio Event Listeners ───────────────────────────────
let _savePositionTimer = null;

audioEl.addEventListener('timeupdate', () => {
  const { currentTime, duration } = audioEl;
  if (!duration) return;
  const pct = (currentTime / duration) * 100;
  const filled = document.getElementById('progress-filled');
  const thumb  = document.getElementById('progress-thumb');
  if (filled) filled.style.width = `${pct}%`;
  if (thumb)  thumb.style.left  = `${pct}%`;
  const cur = document.getElementById('time-current');
  const tot = document.getElementById('time-total');
  if (cur) cur.textContent = formatTime(currentTime);
  if (tot) tot.textContent = formatTime(duration);

  // Throttle-save position every 5 s so resume is always fresh
  if (!_savePositionTimer) {
    _savePositionTimer = setTimeout(() => {
      _savePositionTimer = null;
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
  document.getElementById('time-total') && (document.getElementById('time-total').textContent = formatTime(audioEl.duration));
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
    const btn = document.getElementById('mode-btn');
    if (!btn) return;
    btn.innerHTML = MODE_ICONS[state.playbackMode];
    btn.title = MODE_LABELS[state.playbackMode];
    btn.classList.toggle('text-cyan-400', state.playbackMode !== 'none');
    btn.classList.toggle('text-gray-500', state.playbackMode === 'none');
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

    const inUserPlaylist = state.activePlaylistName !== null;
    // When rendering a filtered subset, map each song to its TRUE index in currentPlaylist
    // This fixes the search-click bug: clicking a result plays the correct song.
    const isFiltered = songs !== state.currentPlaylist;

    container.innerHTML = songs.map((song, i) => {
      // Resolve original index for playback — object reference equality
      const playlistIdx = isFiltered ? state.currentPlaylist.indexOf(song) : i;
      const isActive = playlistIdx === state.currentSongIndex && playlistIdx !== -1;
      const artists = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
      const thumbUrl = DataLoader.getThumbnailUrl(song);
      const audioUrl = DataLoader.getAudioUrl(song);

      return `
        <div
          class="song-item flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
            ${isActive ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 active-song' : 'hover:bg-white/5 border border-transparent'}"
          data-index="${playlistIdx}"
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
          <div class="flex items-center gap-2 flex-shrink-0">
            ${inUserPlaylist
              ? `<button class="remove-btn w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center text-sm transition-colors" data-url="${audioUrl}" title="Remove">−</button>`
              : `<button class="add-btn w-7 h-7 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 flex items-center justify-center text-sm transition-colors" data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}' title="Add to playlist">+</button>`
            }
          </div>
        </div>`;
    }).join('');

    // Attach song click listeners
    container.querySelectorAll('.song-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Don't trigger on buttons
        if (e.target.classList.contains('add-btn') || e.target.classList.contains('remove-btn') || e.target.classList.contains('drag-handle')) return;
        const idx = parseInt(el.dataset.index);
        Playlist.playAt(idx);
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

    // Remove-from-playlist buttons
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const audioUrl = btn.dataset.url;
        UserPlaylists.removeSong(state.activePlaylistName, audioUrl);
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

  /** Scroll the song list to bring index into view */
  scrollToSong(index) {
    const container = document.getElementById('song-list');
    if (!container) return;
    const items = container.querySelectorAll('.song-item');
    if (items[index]) {
      items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /** Update the bottom player UI for a given song */
  updatePlayerUI(song) {
    const artists = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
    const el = (id) => document.getElementById(id);

    el('player-title') && (el('player-title').textContent = song.title);
    el('player-artist') && (el('player-artist').textContent = artists);

    // Thumbnail with fallback + spin animation
    const thumb = el('player-thumb');
    if (thumb) {
      thumb.src = DataLoader.getThumbnailUrl(song);
      thumb.onerror = () => {
        thumb.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%23374151' rx='22'/><text x='22' y='28' text-anchor='middle' font-size='18'>🎵</text></svg>`;
      };
    }

    // Page title
    document.title = `♪ ${song.title} – SoundAura`;
  },

  /** Update playlist header meta */
  updatePlaylistMeta() {
    const meta = document.getElementById('playlist-meta');
    const addBtn = document.getElementById('add-songs-btn');
    if (!meta) return;
    const count = state.currentPlaylist.length;
    if (state.currentFilter) {
      const type = state.currentFilter.type === 'mood' ? '🎭' : '🎤';
      meta.textContent = `${type} ${state.currentFilter.value} · ${count} songs`;
      if (addBtn) addBtn.classList.add('hidden');
    } else if (state.activePlaylistName) {
      meta.textContent = `📂 ${state.activePlaylistName} · ${count} songs`;
      if (addBtn) addBtn.classList.remove('hidden');
    } else {
      meta.textContent = `🎵 All Songs · ${count} songs`;
      if (addBtn) addBtn.classList.add('hidden');
    }
  },

  /** Set play/pause icon + toggle disc spin on thumbnail */
  setPlayPauseIcon(playing) {
    const btn = document.getElementById('play-btn');
    if (!btn) return;
    btn.innerHTML = playing
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
    // Spin the disc thumbnail while playing
    const thumb = document.getElementById('player-thumb');
    if (thumb) thumb.classList.toggle('disc-spin', playing);
  },

  /** Toggle dark / light theme */
  toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.classList.toggle('dark', state.isDarkMode);
    document.body.classList.toggle('light-mode', !state.isDarkMode);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = state.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    Storage.save('darkMode', state.isDarkMode);
    console.log('[Theme] Switched to', state.isDarkMode ? 'dark' : 'light');
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
          UI.renderSongList();
        }
        state.dragSrcIndex = null;
      });
    });
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
      <div class="playlist-item flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors
        ${state.activePlaylistName === name ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300'}"
        data-name="${name}">
        <span class="text-sm truncate">📂 ${name}</span>
        <button class="delete-pl text-gray-600 hover:text-red-400 text-xs ml-2 flex-shrink-0" data-name="${name}">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-pl')) return;
        UserPlaylists.open(el.dataset.name);
      });
    });
    container.querySelectorAll('.delete-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        UserPlaylists.delete(btn.dataset.name);
      });
    });
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
    container.innerHTML = MOODS.map(mood => `
      <button
        class="mood-card flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
        data-mood="${mood.id}"
      >
        <span class="text-3xl">${mood.emoji}</span>
        <span class="text-xs font-medium text-gray-300 group-hover:text-white">${mood.label}</span>
      </button>
    `).join('');

    container.querySelectorAll('.mood-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        const songs = DataLoader.filterByMood(mood);
        if (state.addSongsMode) {
          Explore.showSelectionList(songs, btn.querySelector('span:last-child').textContent);
        } else {
          state.activePlaylistName = null; // clear stale playlist context
          Playlist.set(songs, { type: 'mood', value: btn.querySelector('span:last-child').textContent });
          UI.renderUserPlaylists();
          Explore.close();
          Toast.show(`Loaded ${songs.length} songs for ${mood}`, 'success');
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

    // Inject a temporary selection list
    let sel = document.getElementById('selection-list-section');
    if (!sel) {
      sel = document.createElement('div');
      sel.id = 'selection-list-section';
      document.querySelector('#explore-modal .flex-1.overflow-y-auto')?.appendChild(sel);
    }
    sel.classList.remove('hidden');

    sel.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <button id="sel-back-btn" class="text-gray-400 hover:text-cyan-400 transition-colors text-lg">←</button>
        <span class="text-sm font-medium text-gray-300">${label} · ${songs.length} songs</span>
        <button id="sel-all-btn" class="ml-auto text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors">Select All</button>
      </div>
      <div class="space-y-1">
        ${songs.map((song, i) => {
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
        }).join('')}
      </div>`;

    // Back button
    sel.querySelector('#sel-back-btn')?.addEventListener('click', () => {
      sel.classList.add('hidden');
      if (moodSection) moodSection.classList.remove('hidden');
    });

    // Select All button
    sel.querySelector('#sel-all-btn')?.addEventListener('click', () => {
      const allChecked = songs.every(s => state.selectedSongs.has(DataLoader.getAudioUrl(s)));
      songs.forEach(s => {
        const url = DataLoader.getAudioUrl(s);
        if (allChecked) state.selectedSongs.delete(url);
        else state.selectedSongs.add(url);
      });
      Explore.showSelectionList(songs, label); // re-render
      Explore.updateSelectionCount();
    });

    // Individual checkboxes
    sel.querySelectorAll('.song-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) state.selectedSongs.add(cb.dataset.url);
        else state.selectedSongs.delete(cb.dataset.url);
        const label = cb.closest('label');
        if (label) {
          label.classList.toggle('bg-cyan-500/15', cb.checked);
          label.classList.toggle('border-cyan-500/30', cb.checked);
        }
        Explore.updateSelectionCount();
      });
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
  /** Create a new playlist */
  create(name) {
    if (!name.trim()) return Toast.show('Enter a playlist name', 'error');
    if (state.userPlaylists[name]) return Toast.show('Playlist already exists', 'error');
    state.userPlaylists[name] = [];
    Storage.save('playlists', state.userPlaylists);
    UI.renderUserPlaylists();
    Toast.show(`Created playlist: ${name}`, 'success');
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
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm';
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
    state.userPlaylists[playlistName] = state.userPlaylists[playlistName]
      .filter(s => DataLoader.getAudioUrl(s) !== audioUrl);
    Storage.save('playlists', state.userPlaylists);
    if (state.activePlaylistName === playlistName) {
      state.currentPlaylist = [...state.userPlaylists[playlistName]];
      UI.renderSongList();
      UI.updatePlaylistMeta();
    }
    Toast.show('Removed from playlist', 'info');
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
// 12. TOAST SYSTEM
// ═══════════════════════════════════════════════════════════

const Toast = {
  queue: [],
  showing: false,

  show(message, type = 'info') {
    const colors = {
      success: 'bg-emerald-500/90',
      error: 'bg-red-500/90',
      warning: 'bg-amber-500/90',
      info: 'bg-blue-500/90'
    };

    const toast = document.createElement('div');
    toast.className = `fixed bottom-28 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl
      ${colors[type] || colors.info} backdrop-blur-sm transform transition-all duration-300 translate-x-full`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full');
      });
    });

    // Remove after 2.5s
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
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
// 14. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function bindEvents() {
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

  // ── Volume Slider ──
  const volSlider = document.getElementById('volume-slider');
  volSlider?.addEventListener('input', () => {
    Volume.set(parseFloat(volSlider.value));
  });

  // ── Volume Mute Toggle ──
  document.getElementById('volume-icon')?.addEventListener('click', Volume.toggleMute);

  // ── Player Controls ──
  document.getElementById('play-btn')?.addEventListener('click', () => {
    AudioEngine.init();
    Player.togglePlay();
  });
  document.getElementById('next-btn')?.addEventListener('click', Player.next);
  document.getElementById('prev-btn')?.addEventListener('click', Player.prev);
  document.getElementById('skip-fwd-btn')?.addEventListener('click', () => Player.skip(10));
  document.getElementById('skip-back-btn')?.addEventListener('click', () => Player.skip(-10));
  document.getElementById('mode-btn')?.addEventListener('click', PlaybackMode.cycle);

  // ── Progress Bar (mouse + touch) ──
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const scrubTo = (clientX) => {
      const rect = progressBar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
    };

    // Mouse
    progressBar.addEventListener('click', (e) => scrubTo(e.clientX));
    let mouseScrubbing = false;
    progressBar.addEventListener('mousedown', (e) => { mouseScrubbing = true; scrubTo(e.clientX); });
    document.addEventListener('mousemove',  (e) => { if (mouseScrubbing) scrubTo(e.clientX); });
    document.addEventListener('mouseup',    ()  => { mouseScrubbing = false; });

    // Touch
    progressBar.addEventListener('touchstart', (e) => {
      e.preventDefault();
      scrubTo(e.touches[0].clientX);
    }, { passive: false });
    progressBar.addEventListener('touchmove', (e) => {
      e.preventDefault();
      scrubTo(e.touches[0].clientX);
    }, { passive: false });
  }

  // ── Custom Speed Dropdown ──
  const speedBtn  = document.getElementById('speed-btn');
  const speedMenu = document.getElementById('speed-menu');
  speedBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu?.classList.toggle('hidden');
  });
  // Close on outside click
  document.addEventListener('click', () => speedMenu?.classList.add('hidden'));
  speedMenu?.querySelectorAll('[data-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rate = parseFloat(btn.dataset.speed);
      audioEl.playbackRate = rate;
      // Update label
      if (speedBtn) speedBtn.textContent = `${rate === Math.floor(rate) ? rate : rate}×`;
      // Update active highlight
      speedMenu.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active-speed'));
      btn.classList.add('active-speed');
      speedMenu.classList.add('hidden');
    });
  });

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
  document.getElementById('mobile-library-btn')?.addEventListener('click', () => {
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const sidebar = document.getElementById('mobile-sidebar-drawer');
    overlay?.classList.remove('hidden');
    sidebar?.classList.remove('translate-x-full');
  });
  document.getElementById('mobile-sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('mobile-sidebar-overlay')?.classList.add('hidden');
    document.getElementById('mobile-sidebar-drawer')?.classList.add('translate-x-full');
  });
  document.getElementById('close-mobile-sidebar')?.addEventListener('click', () => {
    document.getElementById('mobile-sidebar-overlay')?.classList.add('hidden');
    document.getElementById('mobile-sidebar-drawer')?.classList.add('translate-x-full');
  });

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    switch (e.code) {
      case 'Space':    e.preventDefault(); Player.togglePlay(); break;
      case 'ArrowRight': Player.skip(10); break;
      case 'ArrowLeft':  Player.skip(-10); break;
      case 'KeyN':     Player.next(); break;
      case 'KeyP':     Player.prev(); break;
      case 'KeyM':     PlaybackMode.cycle(); break;
      case 'KeyR':     Playlist.playRandom(); break;  // R → random song
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
}

// ═══════════════════════════════════════════════════════════
// 15. SERVICE WORKER REGISTRATION
// ═══════════════════════════════════════════════════════════

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
}

// ═══════════════════════════════════════════════════════════
// 16. INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function init() {
  console.log('[SoundAura] Initializing...');

  // Load persisted state
  Storage.loadAll();

  // Apply theme
  document.documentElement.classList.toggle('dark', state.isDarkMode);
  document.body.classList.toggle('light-mode', !state.isDarkMode);
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.textContent = state.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';

  // Load songs
  await DataLoader.loadSongs();

  // Restore last context (mood/singer/playlist/all) + last song position
  // Falls back to "All Songs" for first-time visitors
  Storage.restoreContext();

  // Render user playlists sidebar
  UI.renderUserPlaylists();
  UI.updatePlaylistMeta();

  // Update mode button
  PlaybackMode.updateUI();

  // Bind all event listeners
  bindEvents();

  // Restore EQ settings
  const eqSettings = Storage.load('eqSettings');
  if (eqSettings && state.audioContext) {
    eqSettings.forEach((val, i) => AudioEngine.setEQBand(i, val));
  }

  // Restore volume from persisted state
  Volume.restore();

  // Register service worker
  registerServiceWorker();

  // Initialize EQ panel (draggable)
  EQPanel.initDraggable();
  EQPanel.renderCustomPresets();

  // Restore EQ slider display values from storage (even before AudioContext init)
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
