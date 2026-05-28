/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║       SoundAura — Atmosphere Engine v3.0 (Performance)      ║
 * ║                                                              ║
 * ║  ARCHITECTURE:                                               ║
 * ║   Two clearly separated worlds:                              ║
 * ║                                                              ║
 * ║   NORMAL MODE   — Zero canvas. Zero RAF. Zero cost.         ║
 * ║   IMMERSIVE MODE — Full cinematic atmosphere, on demand.     ║
 * ║                                                              ║
 * ║  Systems:                                                    ║
 * ║   ThemeSync          — Centralized theme color bridge        ║
 * ║   PaletteExtractor   — Web Worker k-means, permanent cache   ║
 * ║   AudioReactive      — Web Audio analyser, immersive-only    ║
 * ║   PerformanceMonitor — FPS tracking + adaptive quality       ║
 * ║   CinematicAtmosphere— Large blobs + rays, single RAF loop   ║
 * ║   ExpandPlayer       — Full-screen modal, deferred init      ║
 * ║   RandomSongAnim     — Lightweight SVG orbs (home screen)    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const AtmosphereEngine = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  //  SHARED STATE
  // ─────────────────────────────────────────────────────────────
  const _s = {
    initialized:      false,
    atmosphereEnabled: true,    // user preference toggle (was particlesOn)
    isMobile:         /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    themeAccent:      '#06b6d4',
    themeAccent2:     '#3b82f6',
    themeRgb:         '6,182,212',
  };

  // ─────────────────────────────────────────────────────────────
  //  MATH HELPERS
  // ─────────────────────────────────────────────────────────────
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function _rgba(color, alpha) {
    const a = clamp(alpha, 0, 1);
    if (!color) return `rgba(128,128,128,${a})`;
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (color.startsWith('rgb('))
      return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
    if (color.startsWith('rgba('))
      return color.replace(/,[\d.]+\)$/, `,${a})`);
    return `rgba(128,128,128,${a})`;
  }

  function _fmtTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────
  //  THEME SYNC
  //  Reads CSS custom properties so all subsystems share one
  //  source of truth for accent colors.
  // ─────────────────────────────────────────────────────────────
  const ThemeSync = {
    _palette: null,

    refresh() {
      const cs = getComputedStyle(document.documentElement);
      _s.themeAccent  = cs.getPropertyValue('--theme-accent').trim()      || '#06b6d4';
      _s.themeAccent2 = cs.getPropertyValue('--theme-accent2').trim()     || '#3b82f6';
      _s.themeRgb     = cs.getPropertyValue('--theme-accent-rgb').trim()  || '6,182,212';
      this._palette   = null; // invalidate
    },

    getPalette() {
      if (!this._palette) this._palette = [_s.themeAccent, _s.themeAccent2];
      return this._palette;
    },

    glowColor(alpha = 0.25) {
      return `rgba(${_s.themeRgb},${alpha})`;
    },

    toRgba(color, alpha) { return _rgba(color, alpha); },
  };

  // ─────────────────────────────────────────────────────────────
  //  PALETTE EXTRACTOR — Web Worker + permanent cache
  //
  //  Rules:
  //   • Extraction only happens when immersive mode opens.
  //   • Results are cached permanently (album art is static).
  //   • Main thread never blocks on k-means.
  //   • Graceful fallback if Worker unavailable.
  // ─────────────────────────────────────────────────────────────

  // Worker source — runs k-means in a separate thread
  const _WORKER_SRC = `
    self.onmessage = function(e) {
      var d = e.data, key = d.key, px = d.pixels, k = d.k || 4;
      try {
        var result = kMeans(px, k);
        self.postMessage({ key: key, palette: result, ok: true });
      } catch(err) {
        self.postMessage({ key: key, ok: false });
      }
    };

    function kMeans(px, k) {
      var n = Math.floor(px.length / 3);
      if (n < k) return null;
      var step = Math.floor(n / k);
      var centers = [];
      for (var i = 0; i < k; i++) {
        var idx = i * step * 3;
        centers.push([px[idx], px[idx+1], px[idx+2]]);
      }
      for (var iter = 0; iter < 12; iter++) {
        var sums = [];
        for (var c = 0; c < k; c++) sums.push([0,0,0,0]);
        for (var i = 0; i < n; i++) {
          var r = px[i*3], g = px[i*3+1], b = px[i*3+2];
          var best = 0, bestD = Infinity;
          for (var c = 0; c < k; c++) {
            var dr=r-centers[c][0], dg=g-centers[c][1], db=b-centers[c][2];
            var d = dr*dr+dg*dg+db*db;
            if (d < bestD) { bestD = d; best = c; }
          }
          sums[best][0]+=r; sums[best][1]+=g; sums[best][2]+=b; sums[best][3]++;
        }
        var converged = true;
        for (var c = 0; c < k; c++) {
          if (!sums[c][3]) continue;
          var nr=Math.round(sums[c][0]/sums[c][3]);
          var ng=Math.round(sums[c][1]/sums[c][3]);
          var nb=Math.round(sums[c][2]/sums[c][3]);
          var dr=nr-centers[c][0], dg=ng-centers[c][1], db=nb-centers[c][2];
          if (Math.sqrt(dr*dr+dg*dg+db*db) > 2) converged = false;
          centers[c] = [nr, ng, nb];
        }
        if (converged) break;
      }
      return centers.map(function(c){ return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; });
    }
  `;

  const PaletteExtractor = {
    _cache:     new Map(),   // imageUrl → colors[]
    _worker:    null,
    _callbacks: new Map(),   // key → [cb, cb, ...]
    _workerUrl: null,
    SIZE:       48,

    _ensureWorker() {
      if (this._worker) return;
      try {
        this._workerUrl = URL.createObjectURL(
          new Blob([_WORKER_SRC], { type: 'application/javascript' })
        );
        this._worker = new Worker(this._workerUrl);
        this._worker.onmessage = (e) => {
          const { key, palette, ok } = e.data;
          const palette2 = (ok && palette) ? palette : ThemeSync.getPalette();
          if (!this._cache.has(key)) this._cache.set(key, palette2);
          const cbs = this._callbacks.get(key) || [];
          this._callbacks.delete(key);
          cbs.forEach(cb => cb(palette2));
        };
        this._worker.onerror = (err) => {
          console.warn('[Atmosphere] Worker error:', err);
          // On error, resolve all pending with theme palette
          this._callbacks.forEach((cbs, key) => {
            const fallback = ThemeSync.getPalette();
            if (!this._cache.has(key)) this._cache.set(key, fallback);
            cbs.forEach(cb => cb(fallback));
          });
          this._callbacks.clear();
        };
      } catch (e) {
        this._worker = null; // Will fall back to sync extraction
      }
    },

    /**
     * Extract palette — only called from immersive mode.
     * Returns cached result immediately if available, otherwise
     * processes in Web Worker and calls back asynchronously.
     */
    extractImmersive(imageUrl, cb) {
      if (!imageUrl || imageUrl.startsWith('data:')) return cb(ThemeSync.getPalette());

      // Return cached result instantly (no cost)
      if (this._cache.has(imageUrl)) return cb(this._cache.get(imageUrl));

      // Queue callback
      if (!this._callbacks.has(imageUrl)) {
        this._callbacks.set(imageUrl, []);
      }
      this._callbacks.get(imageUrl).push(cb);

      // Already loading this image
      if (this._callbacks.get(imageUrl).length > 1) return;

      this._ensureWorker();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const S = this.SIZE;
          const cv = document.createElement('canvas');
          cv.width = cv.height = S;
          const cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0, S, S);
          const data = cx.getImageData(0, 0, S, S).data;

          // Filter pixels on main thread (fast) — worker only does k-means
          const pixels = [];
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a < 100) continue;
            const br = (r + g + b) / 3;
            if (br > 235 || br < 20) continue;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            if (sat < 20) continue;
            pixels.push(r, g, b);
          }

          if (pixels.length < 24 || !this._worker) {
            // Too few pixels or no worker — use theme palette
            const fallback = ThemeSync.getPalette();
            this._cache.set(imageUrl, fallback);
            const cbs = this._callbacks.get(imageUrl) || [];
            this._callbacks.delete(imageUrl);
            cbs.forEach(fn => fn(fallback));
            return;
          }

          // Send to worker (non-blocking)
          const arr = new Uint8Array(pixels);
          this._worker.postMessage({ key: imageUrl, pixels: arr, k: 4 }, [arr.buffer]);
        } catch (e) {
          const fallback = ThemeSync.getPalette();
          this._cache.set(imageUrl, fallback);
          const cbs = this._callbacks.get(imageUrl) || [];
          this._callbacks.delete(imageUrl);
          cbs.forEach(fn => fn(fallback));
        }
      };
      img.onerror = () => {
        const fallback = ThemeSync.getPalette();
        this._cache.set(imageUrl, fallback);
        const cbs = this._callbacks.get(imageUrl) || [];
        this._callbacks.delete(imageUrl);
        cbs.forEach(fn => fn(fallback));
      };
      img.src = imageUrl;
    },

    /** Terminate worker and free resources (call on app unload if needed) */
    destroy() {
      if (this._worker) { this._worker.terminate(); this._worker = null; }
      if (this._workerUrl) { URL.revokeObjectURL(this._workerUrl); this._workerUrl = null; }
      this._callbacks.clear();
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  AUDIO REACTIVE — Immersive mode only
  //
  //  Lifecycle: init() → start() → [pause()] → destroy()
  //  Never active during normal mode.
  // ─────────────────────────────────────────────────────────────
  const AudioReactive = {
    _analyser: null,
    _buf:      null,
    _raf:      null,
    active:    false,

    // Smoothed outputs (0–1)
    bass: 0, mid: 0, high: 0, energy: 0,
    onBeat: false,
    _beatCooldown: 0,

    init(analyser) {
      if (!analyser) return;
      // Avoid reinit if same analyser
      if (this._analyser === analyser) return;
      this.destroy();
      this._analyser = analyser;
      this._buf = new Uint8Array(analyser.frequencyBinCount);
    },

    start() {
      if (this.active || !this._analyser) return;
      this.active = true;
      this._tick();
    },

    pause() {
      this.active = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    },

    destroy() {
      this.pause();
      this._analyser = null;
      this._buf      = null;
      this.bass = this.mid = this.high = this.energy = 0;
      this.onBeat = false;
      this._beatCooldown = 0;
    },

    _tick() {
      if (!this.active) return;
      this._raf = requestAnimationFrame(() => this._tick());
      this._analyser.getByteFrequencyData(this._buf);

      const n    = this._buf.length;
      const bEnd = Math.floor(n * 0.05);
      const mEnd = Math.floor(n * 0.20);
      const hEnd = Math.floor(n * 0.38);

      let rawB = 0, rawM = 0, rawH = 0;
      for (let i = 0;    i < bEnd; i++) rawB += this._buf[i];
      for (let i = bEnd; i < mEnd; i++) rawM += this._buf[i];
      for (let i = mEnd; i < hEnd; i++) rawH += this._buf[i];
      rawB /= bEnd * 255;
      rawM /= (mEnd - bEnd) * 255;
      rawH /= (hEnd - mEnd) * 255;

      const α    = 0.84;
      this.bass   = this.bass  * α + rawB * (1 - α);
      this.mid    = this.mid   * α + rawM * (1 - α);
      this.high   = this.high  * α + rawH * (1 - α);
      this.energy = this.bass * 0.55 + this.mid * 0.30 + this.high * 0.15;

      if (this._beatCooldown > 0) this._beatCooldown--;
      if (rawB > 0.55 && this._beatCooldown === 0) {
        this.onBeat = true;
        this._beatCooldown = 12;
      } else {
        this.onBeat = false;
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  PERFORMANCE MONITOR — Immersive mode only
  //
  //  Measures FPS every 2s and drives adaptive quality.
  //  Only runs while immersive mode is open.
  // ─────────────────────────────────────────────────────────────
  const PerformanceMonitor = {
    fps:      60,
    quality:  'high',     // 'high' | 'medium' | 'low' | 'minimal'
    _frames:  0,
    _lastTs:  0,
    _timer:   null,

    start() {
      this._lastTs = performance.now();
      this._frames = 0;
      if (_s.isMobile) this.quality = 'medium';
      this._timer = setInterval(() => this._measure(), 2000);
    },

    stop() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
    },

    tick() { this._frames++; },

    _measure() {
      const now     = performance.now();
      const elapsed = now - this._lastTs;
      this.fps      = Math.min(Math.round((this._frames / elapsed) * 1000), 120);
      this._frames  = 0;
      this._lastTs  = now;
      this._updateQuality();
    },

    _updateQuality() {
      const prev = this.quality;
      if (_s.isMobile) {
        this.quality = this.fps >= 50 ? 'medium' : this.fps >= 35 ? 'low' : 'minimal';
      } else {
        this.quality = this.fps >= 50 ? 'high'
                     : this.fps >= 40 ? 'medium'
                     : this.fps >= 28 ? 'low'
                     : 'minimal';
      }
      if (prev !== this.quality) {
        console.log(`[Atmosphere] Quality: ${prev} → ${this.quality} (${this.fps}fps)`);
        CinematicAtmosphere._onQualityChange(this.quality);
      }
    },

    maxBlobs() {
      const base = { high: 4, medium: 3, low: 2, minimal: 1 };
      return _s.isMobile ? Math.min(base[this.quality] || 2, 3) : (base[this.quality] || 3);
    },

    maxRays() {
      const base = { high: 5, medium: 4, low: 2, minimal: 0 };
      return _s.isMobile ? Math.min(base[this.quality] || 2, 3) : (base[this.quality] || 4);
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  CINEMATIC ATMOSPHERE
  //
  //  Premium, Apple Music-style atmosphere engine.
  //
  //  Strategy:
  //   • A FEW large cinematic blobs — not many tiny particles.
  //   • A FEW premium rays — slow, elegant, barely visible.
  //   • ONE master render loop — no parallel RAFs.
  //   • Canvas at 70% resolution upscaled via CSS.
  //   • Full destroy() — no leaks after repeated open/close cycles.
  //
  //  Lifecycle: attachTo(container) → start(colors) → [destroy()]
  // ─────────────────────────────────────────────────────────────
  const CinematicAtmosphere = {
    _cv:     null,
    _cx:     null,
    _raf:    null,
    _on:     false,
    _t:      0,
    _colors: ['#06b6d4', '#3b82f6'],
    _blobs:  [],
    _rays:   [],
    _resizeHandler: null,

    /**
     * Attach canvas to a container element.
     * Safe to call multiple times — only creates canvas once.
     */
    attachTo(container) {
      if (!container) return;
      if (this._cv && this._cv.parentNode === container) return;

      if (!this._cv) {
        const cv = document.createElement('canvas');
        cv.id = 'atm-cinematic-canvas';
        cv.setAttribute('aria-hidden', 'true');
        // CSS makes it fill the container; actual pixel dimensions are 70%
        cv.style.cssText = [
          'position:absolute', 'inset:0',
          'width:100%', 'height:100%',
          'pointer-events:none', 'z-index:0',
          'border-radius:inherit',
          'will-change:transform',
        ].join(';');
        this._cv = cv;
        this._cx = cv.getContext('2d', { alpha: true });
      }
      container.appendChild(this._cv);
    },

    /**
     * Start the atmosphere.
     * colors — optional palette from album art.
     */
    start(colors) {
      if (!this._cv || !_s.atmosphereEnabled) return;
      if (colors && colors.length) this._colors = colors;

      this._resize();
      this._spawnAll();
      this._on = true;
      this._t  = 0;

      // Bind resize once
      if (!this._resizeHandler) {
        this._resizeHandler = () => this._resize();
        window.addEventListener('resize', this._resizeHandler, { passive: true });
      }

      this._loop();
      console.log('[Atmosphere] CinematicAtmosphere ON');
    },

    pause() {
      this._on = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    },

    /**
     * Fully destroy — cancel RAF, remove listeners, clear all arrays, free canvas.
     * Call this when immersive mode closes.
     */
    destroy() {
      this._on = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._cx && this._cv) {
        this._cx.clearRect(0, 0, this._cv.width, this._cv.height);
      }
      // Remove canvas from DOM — container may be hidden but we clean up properly
      if (this._cv && this._cv.parentNode) {
        this._cv.parentNode.removeChild(this._cv);
      }
      this._cv    = null;
      this._cx    = null;
      this._blobs = [];
      this._rays  = [];
      console.log('[Atmosphere] CinematicAtmosphere destroyed');
    },

    updateColors(colors) {
      if (!colors || !colors.length) return;
      this._colors = colors;
      this._blobs.forEach((b, i) => { b.color = colors[i % colors.length]; });
      this._rays .forEach((r, i) => { r.color = colors[i % colors.length]; });
    },

    _onQualityChange(q) {
      if (!this._on) return;
      // Rebuild blobs/rays to match new quality level
      this._spawnAll();
    },

    _resize() {
      if (!this._cv) return;
      // Render at 70% — CSS upscales to 100%
      const W = Math.round((this._cv.offsetWidth  || window.innerWidth)  * 0.7);
      const H = Math.round((this._cv.offsetHeight || window.innerHeight) * 0.7);
      if (this._cv.width !== W || this._cv.height !== H) {
        this._cv.width  = W;
        this._cv.height = H;
      }
    },

    _spawnAll() {
      if (!this._cv) return;
      const W = this._cv.width  || Math.round(window.innerWidth  * 0.7);
      const H = this._cv.height || Math.round(window.innerHeight * 0.7);
      this._spawnBlobs(W, H);
      this._spawnRays(W, H);
    },

    /**
     * Spawn large cinematic blobs — the atmosphere's "heartbeat".
     * Few in number, generous in size, very slow in movement.
     */
    _spawnBlobs(W, H) {
      const count  = PerformanceMonitor.maxBlobs();
      const colors = this._colors;
      this._blobs  = Array.from({ length: count }, (_, i) => ({
        // Position: spread around center
        x:    W * (0.2 + Math.random() * 0.6),
        y:    H * (0.15 + Math.random() * 0.7),
        // Very slow drift — cinematic, not frantic
        vx:   (Math.random() - 0.5) * 0.18,
        vy:   (Math.random() - 0.5) * 0.18,
        // Large radii — Apple Music style
        baseR: Math.random() * 80 + 90,   // 90–170px at full res
        r:     0,
        // Breathing phase
        φ:    Math.random() * Math.PI * 2,
        φs:   Math.random() * 0.006 + 0.003,
        // Low alpha — subtle, cinematic
        baseA: Math.random() * 0.055 + 0.03,
        a:     0,
        color: colors[i % colors.length],
        // Born-in fade
        born:  0,
      }));
    },

    /**
     * Spawn premium rays — slow rotating light shafts.
     * Reduced to a few elegant beams, never a spotlight show.
     */
    _spawnRays(W, H) {
      const count  = PerformanceMonitor.maxRays();
      const colors = this._colors;
      this._rays   = Array.from({ length: count }, (_, i) => ({
        angle: (i / Math.max(count, 1)) * Math.PI * 2 + Math.random() * 0.5,
        rotV:  (Math.random() - 0.5) * 0.0004,   // glacially slow rotation
        len:   Math.random() * 0.3 + 0.4,         // fraction of screen diagonal
        width: Math.random() * 0.10 + 0.05,       // arc width in radians
        a:     Math.random() * 0.018 + 0.006,     // very subtle
        φ:     Math.random() * Math.PI * 2,
        φs:    Math.random() * 0.003 + 0.001,
        color: colors[i % colors.length],
      }));
    },

    /**
     * Single master render loop — no parallel RAFs.
     *  1. Clear
     *  2. Blobs (large, few)
     *  3. Rays (premium, few)
     */
    _loop() {
      if (!this._on) return;
      this._raf = requestAnimationFrame(() => this._loop());
      PerformanceMonitor.tick();

      const cx = this._cx;
      if (!cx || !this._cv) return;

      const W = this._cv.width;
      const H = this._cv.height;
      this._t += 0.008;

      // Clear with slight motion-blur trail — cinematic feel
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = 'rgba(4,10,22,0.15)';
      cx.fillRect(0, 0, W, H);

      const bass   = AudioReactive.bass;
      const high   = AudioReactive.high;
      const isBeat = AudioReactive.onBeat;

      this._renderBlobs(cx, W, H, bass, isBeat);
      this._renderRays (cx, W, H, bass, high, isBeat);
    },

    _renderBlobs(cx, W, H, bass, isBeat) {
      for (const b of this._blobs) {
        // Born-in fade
        b.born = Math.min(1, b.born + 0.008);

        // Slow drift with screen wrapping
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.baseR * 2) b.x = W + b.baseR;
        if (b.x > W + b.baseR * 2) b.x = -b.baseR;
        if (b.y < -b.baseR * 2) b.y = H + b.baseR;
        if (b.y > H + b.baseR * 2) b.y = -b.baseR;

        // Breathing size
        b.φ += b.φs;
        const breathe = 1 + Math.sin(b.φ) * 0.14;
        const beatSz  = isBeat ? (1 + bass * 0.4) : 1;
        b.r = b.baseR * breathe * beatSz * (1 + bass * 0.25);

        // Breathing alpha
        const targetA = (b.baseA + Math.sin(b.φ * 0.7) * 0.015 + bass * 0.02) * b.born;
        b.a = lerp(b.a, targetA, 0.04);

        // Layered radial gradient — soft, large, cinematic
        const grad = cx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.2);
        grad.addColorStop(0,    _rgba(b.color, b.a * 2.2));
        grad.addColorStop(0.35, _rgba(b.color, b.a * 0.9));
        grad.addColorStop(0.7,  _rgba(b.color, b.a * 0.2));
        grad.addColorStop(1,    _rgba(b.color, 0));
        cx.beginPath();
        cx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2);
        cx.fillStyle = grad;
        cx.fill();
      }
    },

    _renderRays(cx, W, H, bass, high, isBeat) {
      if (!this._rays.length) return;

      // Rays emit from the album art center point
      const rCx = W * 0.5;
      const rCy = H * 0.42;
      const diag = Math.sqrt(W * W + H * H);

      cx.save();
      for (const ray of this._rays) {
        ray.angle += ray.rotV;
        ray.φ += ray.φs;

        const breathe      = 1 + Math.sin(ray.φ) * 0.16;
        const beatBoost    = 1 + bass * 0.6;
        const treblePulse  = 1 + high * (Math.sin(this._t * 14 + ray.φ) * 0.25);
        const rayLen       = diag * ray.len * beatBoost * breathe;
        const halfArc      = ray.width * 0.5 * beatBoost;
        const alpha        = ray.a * breathe * treblePulse;

        const x2    = rCx + Math.cos(ray.angle) * rayLen;
        const y2    = rCy + Math.sin(ray.angle) * rayLen;
        const perpX = -Math.sin(ray.angle) * rayLen * Math.tan(halfArc);
        const perpY =  Math.cos(ray.angle) * rayLen * Math.tan(halfArc);

        const grad = cx.createLinearGradient(rCx, rCy, x2, y2);
        grad.addColorStop(0,    _rgba(ray.color, alpha));
        grad.addColorStop(0.4,  _rgba(ray.color, alpha * 0.45));
        grad.addColorStop(0.75, _rgba(ray.color, alpha * 0.12));
        grad.addColorStop(1,    _rgba(ray.color, 0));

        cx.beginPath();
        cx.moveTo(rCx, rCy);
        cx.lineTo(x2 + perpX, y2 + perpY);
        cx.lineTo(x2 - perpX, y2 - perpY);
        cx.closePath();
        cx.fillStyle = grad;
        cx.fill();
      }
      cx.restore();

      // Center bloom halo — subtle glow around album art origin
      if (bass > 0.04) {
        const bloomR = 40 + bass * 70;
        const bloomA = 0.03 + bass * 0.04;
        const bloom  = cx.createRadialGradient(rCx, rCy, 0, rCx, rCy, bloomR);
        bloom.addColorStop(0,   _rgba(this._colors[0], bloomA * 2));
        bloom.addColorStop(0.5, _rgba(this._colors[0], bloomA));
        bloom.addColorStop(1,   _rgba(this._colors[0], 0));
        cx.beginPath();
        cx.arc(rCx, rCy, bloomR, 0, Math.PI * 2);
        cx.fillStyle = bloom;
        cx.fill();
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  EXPAND PLAYER MODAL
  //
  //  Changes from v2:
  //   1. Bar visualizer REMOVED — atmosphere IS the visualizer.
  //   2. Atmosphere init DEFERRED — modal opens instantly first.
  //   3. Full destroy on close — no cost after modal closes.
  //   4. Palette extraction only happens inside immersive mode.
  // ─────────────────────────────────────────────────────────────
  const ExpandPlayer = {
    _modal:      null,
    _open:       false,
    _song:       null,
    _progRaf:    null,
    _artContain: false,

    _build() {
      const m = document.createElement('div');
      m.id = 'expand-player-modal';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', 'Expanded player');
      m.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:48',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'background:rgba(4,10,22,0.97)',
        'opacity:0', 'transition:opacity 0.36s cubic-bezier(0.25,0.46,0.45,0.94)',
        'overflow:hidden',
      ].join(';');

      m.innerHTML = `
        <!-- Blurred bg thumbnail -->
        <div id="ep-bg-blur" style="
          position:absolute;inset:0;z-index:0;
          background-size:cover;background-position:center;
          filter:blur(60px) saturate(0.6);
          opacity:0.18;transform:scale(1.12);
          transition:background-image 0.6s ease, opacity 0.6s ease;
          pointer-events:none;
        "></div>

        <!-- Atmosphere canvas is appended here by CinematicAtmosphere.attachTo() -->

        <!-- Content layer -->
        <div id="ep-content" style="
          position:relative;z-index:2;
          width:100%;max-width:460px;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          padding:clamp(1.4rem,5vw,2.4rem) clamp(1.2rem,5vw,2.6rem);
          gap:clamp(1rem,2.2vh,1.5rem);
          box-sizing:border-box;
        ">

          <!-- Close -->
          <button id="ep-close" aria-label="Close expanded player" style="
            position:absolute;top:-0.3rem;right:0;
            width:2.5rem;height:2.5rem;border-radius:50%;
            border:1px solid rgba(255,255,255,0.1);
            background:rgba(255,255,255,0.05);
            color:#9ca3af;font-size:1rem;
            cursor:pointer;display:flex;align-items:center;justify-content:center;
            transition:all 0.18s ease;backdrop-filter:blur(12px);
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Album Art -->
          <div id="ep-art-wrap" style="position:relative;width:clamp(180px,52vw,260px);aspect-ratio:1;">
            <div id="ep-art-inner" style="
              width:100%;height:100%;border-radius:1.75rem;overflow:hidden;
              box-shadow:0 32px 80px rgba(0,0,0,0.75);
              transition:box-shadow 0.4s ease;
            ">
              <img id="ep-art" src="" alt="Album art" style="
                width:100%;height:100%;
                object-fit:cover;display:block;
                transition:object-fit 0.3s ease;
              " />
            </div>
            <!-- Expand/contain toggle -->
            <button id="ep-art-mode-btn" title="Toggle image fit" style="
              position:absolute;top:-0.5rem;left:-0.5rem;
              width:1.8rem;height:1.8rem;border-radius:50%;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(0,0,0,0.55);
              color:rgba(255,255,255,0.6);font-size:0.65rem;
              cursor:pointer;display:flex;align-items:center;justify-content:center;
              transition:all 0.15s ease;backdrop-filter:blur(8px);z-index:4;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
            <!-- Art overlay vignette -->
            <div id="ep-art-overlay" style="
              position:absolute;inset:0;border-radius:1.75rem;
              background:radial-gradient(ellipse at center, transparent 40%, rgba(4,10,22,0.2) 100%);
              pointer-events:none;z-index:3;
            "></div>
          </div>

          <!-- Song Info -->
          <div style="text-align:center;width:100%;max-width:360px;">
            <h2 id="ep-title" style="
              font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;
              font-size:clamp(1.1rem,4.2vw,1.55rem);line-height:1.18;
              background:linear-gradient(110deg,#e8f4ff,#b8e8ff,#c4b5fd);
              -webkit-background-clip:text;-webkit-text-fill-color:transparent;
              background-clip:text;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              margin-bottom:0.28rem;transition:background 0.4s ease;
            ">Song Title</h2>
            <p id="ep-artist" style="
              color:#6b7fa0;font-size:0.86rem;letter-spacing:0.01em;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            ">Artist</p>
          </div>

          <!-- Progress -->
          <div style="width:100%;max-width:360px;">
            <div id="ep-prog-bar" style="
              height:3px;background:rgba(255,255,255,0.08);
              border-radius:999px;cursor:pointer;
              transition:height 0.14s ease;position:relative;
            ">
              <div id="ep-prog-fill" style="
                height:100%;border-radius:999px;width:0%;pointer-events:none;
                background:linear-gradient(90deg,var(--theme-accent,#06b6d4),var(--theme-accent2,#3b82f6));
                transition:width 0.1s linear;
              "></div>
              <div id="ep-prog-thumb" style="
                position:absolute;top:50%;transform:translate(-50%,-50%);
                width:10px;height:10px;border-radius:50%;
                background:white;opacity:0;pointer-events:none;transition:opacity 0.15s;
              "></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:0.32rem;">
              <span id="ep-cur" style="font-size:0.68rem;color:#4b5a72;font-variant-numeric:tabular-nums;">0:00</span>
              <span id="ep-tot" style="font-size:0.68rem;color:#4b5a72;font-variant-numeric:tabular-nums;">0:00</span>
            </div>
          </div>

          <!-- Controls -->
          <div style="display:flex;align-items:center;gap:1.2rem;">
            <button id="ep-prev" title="Previous" style="
              width:2.7rem;height:2.7rem;border-radius:50%;
              border:1px solid rgba(255,255,255,0.1);
              background:rgba(255,255,255,0.05);
              color:#8b9ab5;cursor:pointer;
              display:flex;align-items:center;justify-content:center;
              transition:all 0.18s ease;backdrop-filter:blur(6px);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button id="ep-play" style="
              width:3.8rem;height:3.8rem;border-radius:50%;border:none;
              background:linear-gradient(135deg,var(--theme-accent,#06b6d4),var(--theme-accent2,#3b82f6));
              color:white;cursor:pointer;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 0 32px rgba(var(--theme-accent-rgb,6,182,212),0.35),0 6px 20px rgba(0,0,0,0.4);
              transition:all 0.18s ease;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </button>
            <button id="ep-next" title="Next" style="
              width:2.7rem;height:2.7rem;border-radius:50%;
              border:1px solid rgba(255,255,255,0.1);
              background:rgba(255,255,255,0.05);
              color:#8b9ab5;cursor:pointer;
              display:flex;align-items:center;justify-content:center;
              transition:all 0.18s ease;backdrop-filter:blur(6px);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

        </div>
      `;

      document.body.appendChild(m);
      this._modal = m;
      this._wire(m);
      return m;
    },

    _wire(m) {
      m.querySelector('#ep-close')?.addEventListener('click', () => this.close());

      m.querySelector('#ep-prev')?.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.prev();
      });
      m.querySelector('#ep-next')?.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.next();
      });
      m.querySelector('#ep-play')?.addEventListener('click', () => {
        if (typeof Player !== 'undefined') {
          if (typeof AudioEngine !== 'undefined') AudioEngine.init();
          Player.togglePlay();
        }
        setTimeout(() => this._syncPlayBtn(), 80);
      });

      m.querySelector('#ep-art-mode-btn')?.addEventListener('click', () => {
        this._artContain = !this._artContain;
        const img  = m.querySelector('#ep-art');
        const wrap = m.querySelector('#ep-art-inner');
        if (img)  img.style.objectFit = this._artContain ? 'contain' : 'cover';
        if (wrap) wrap.style.background = this._artContain ? 'rgba(4,10,22,0.7)' : 'transparent';
      });

      // Progress scrub
      const bar   = m.querySelector('#ep-prog-bar');
      const thumb = m.querySelector('#ep-prog-thumb');
      if (bar) {
        const scrub = (clientX) => {
          const rect = bar.getBoundingClientRect();
          const pct  = clamp((clientX - rect.left) / rect.width, 0, 1);
          const el   = window._soundAuraAudio;
          if (el && el.duration) el.currentTime = pct * el.duration;
        };
        bar.addEventListener('click', e => scrub(e.clientX));
        bar.addEventListener('touchstart', e => { e.preventDefault(); scrub(e.touches[0].clientX); }, { passive: false });
        bar.addEventListener('touchmove',  e => { e.preventDefault(); scrub(e.touches[0].clientX); }, { passive: false });
        bar.addEventListener('mouseenter', () => { bar.style.height = '5px'; if (thumb) thumb.style.opacity = '1'; });
        bar.addEventListener('mouseleave', () => { bar.style.height = '3px'; if (thumb) thumb.style.opacity = '0'; });
        bar.addEventListener('mousemove', e => {
          if (!thumb) return;
          const rect = bar.getBoundingClientRect();
          thumb.style.left = `${clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100}%`;
        });
      }

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this._open) this.close();
      });

      // Hover glow on nav buttons
      [m.querySelector('#ep-prev'), m.querySelector('#ep-next')].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('mouseenter', () => {
          btn.style.color       = _s.themeAccent;
          btn.style.borderColor = _rgba(_s.themeAccent, 0.4);
          btn.style.boxShadow   = `0 0 16px ${_rgba(_s.themeAccent, 0.2)}`;
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.color = btn.style.borderColor = btn.style.boxShadow = '';
        });
      });
    },

    open(song) {
      if (!this._modal) this._build();
      this._song = song;
      this._open = true;

      this._modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('immersive-open');

      // Modal appears instantly
      requestAnimationFrame(() => { this._modal.style.opacity = '1'; });

      // UI updates immediately
      if (song) this._updateUI(song);
      this._startProgSync();
      this._syncPlayBtn();

      // Heavy systems initialize on next frame — UI is already responsive
      requestAnimationFrame(() => this._initAtmosphere(song));
    },

    /**
     * Initialize atmosphere systems.
     * Called one frame after modal opens so UI renders first.
     */
    _initAtmosphere(song) {
      if (!this._open) return;

      // Audio reactive
      if (typeof state !== 'undefined' && state.analyser) {
        AudioReactive.init(state.analyser);
        AudioReactive.start();
      }

      // Attach canvas now (fresh attach each open since destroy() removed it)
      CinematicAtmosphere.attachTo(this._modal);

      // Extract palette (cache hit → instant; cache miss → worker async)
      const imgUrl = song?.image || '';
      PaletteExtractor.extractImmersive(imgUrl, palette => {
        if (!this._open) return; // modal closed before callback
        CinematicAtmosphere.start(palette);
        this._applyGlow(palette);
      });

      PerformanceMonitor.start();
    },

    close() {
      if (!this._open) return;
      this._open = false;
      if (this._modal) {
        this._modal.style.opacity = '0';
        setTimeout(() => {
          if (this._modal) this._modal.style.display = 'none';
        }, 360);
      }
      document.body.style.overflow = '';
      document.body.classList.remove('immersive-open');

      // Destroy ALL heavy systems — no leaks
      CinematicAtmosphere.destroy();
      AudioReactive.destroy();
      PerformanceMonitor.stop();
      this._stopProgSync();
    },

    _updateUI(song) {
      const m = this._modal;
      if (!m) return;
      const artists = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '—');

      requestAnimationFrame(() => {
        const t   = m.querySelector('#ep-title');
        const a   = m.querySelector('#ep-artist');
        const img = m.querySelector('#ep-art');
        const bg  = m.querySelector('#ep-bg-blur');

        if (t) t.textContent = song.title || 'Unknown';
        if (a) a.textContent = artists;

        if (img) {
          img.style.opacity = '0.85';
          img.onerror = () => { img.src = ''; };
          img.onload  = () => { img.style.opacity = '1'; };
          requestAnimationFrame(() => {
            img.src = song.image || '';
            img.style.objectFit = this._artContain ? 'contain' : 'cover';
          });
        }
        if (bg) {
          bg.style.opacity = '0';
          setTimeout(() => {
            bg.style.backgroundImage = song.image ? `url('${song.image}')` : 'none';
            bg.style.opacity = '0.18';
          }, 80);
        }
      });
    },

    _applyGlow(palette) {
      const m = this._modal;
      if (!m || !palette.length) return;
      const inner = m.querySelector('#ep-art-inner');
      const title = m.querySelector('#ep-title');
      const c1    = palette[0];
      const c2    = palette[1] || palette[0];

      if (inner) inner.style.boxShadow = `0 32px 80px rgba(0,0,0,0.75), 0 0 70px ${_rgba(c1, 0.28)}`;
      if (title && palette.length >= 2) {
        title.style.background             = `linear-gradient(110deg,#e8f4ff,${c1},${c2})`;
        title.style.webkitBackgroundClip   = 'text';
        title.style.backgroundClip         = 'text';
        title.style.webkitTextFillColor    = 'transparent';
      }
    },

    _startProgSync() {
      const tick = () => {
        if (!this._open) return;
        this._progRaf = requestAnimationFrame(tick);
        const el = window._soundAuraAudio;
        const m  = this._modal;
        if (!el || !m) return;
        const pct  = el.duration ? (el.currentTime / el.duration) * 100 : 0;
        const fill = m.querySelector('#ep-prog-fill');
        const cur  = m.querySelector('#ep-cur');
        const tot  = m.querySelector('#ep-tot');
        if (fill) fill.style.width  = `${pct}%`;
        if (cur)  cur.textContent   = _fmtTime(el.currentTime);
        if (tot)  tot.textContent   = _fmtTime(el.duration || 0);
      };
      tick();
    },

    _stopProgSync() {
      if (this._progRaf) { cancelAnimationFrame(this._progRaf); this._progRaf = null; }
    },

    _syncPlayBtn() {
      const btn = this._modal?.querySelector('#ep-play');
      if (!btn) return;
      const el      = window._soundAuraAudio;
      const playing = el && !el.paused;
      btn.innerHTML = playing
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    },

    onSongChange(song) {
      this._song = song;
      if (!this._open || !song) return;

      this._updateUI(song);
      setTimeout(() => this._syncPlayBtn(), 120);

      // Update atmosphere with new album art
      const imgUrl = song.image || '';
      PaletteExtractor.extractImmersive(imgUrl, palette => {
        if (!this._open) return;
        CinematicAtmosphere.updateColors(palette);
        this._applyGlow(palette);
      });

      // Re-init audio reactive if needed
      if (typeof state !== 'undefined' && state.analyser) {
        if (!AudioReactive.active) {
          AudioReactive.init(state.analyser);
          AudioReactive.start();
        }
      }
    },

    isOpen() { return this._open; },
  };

  // ─────────────────────────────────────────────────────────────
  //  RANDOM SONG HIGHLIGHT ANIMATION
  //  Lightweight SVG orb animation on home screen for randomly
  //  selected songs. Two soft orbs orbit the highlighted item.
  //  No canvas. No RAF on normal song items.
  // ─────────────────────────────────────────────────────────────
  const RandomSongAnim = {
    _el:    null,
    _raf:   null,
    _svg:   null,
    _t:     0,
    _alive: false,

    attach(songItemEl) {
      this.detach();
      if (!songItemEl) return;
      this._el    = songItemEl;
      this._t     = 0;
      this._alive = true;

      songItemEl.classList.add('random-selected-active');

      if (getComputedStyle(songItemEl).position === 'static')
        songItemEl.style.position = 'relative';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'random-orb-svg';
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);pointer-events:none;z-index:10;overflow:visible;border-radius:inherit;';
      svg.innerHTML = `
        <defs>
          <filter id="rand-glow"  x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="rand-glow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <ellipse id="rand-orb1"   rx="6" ry="6" filter="url(#rand-glow)"/>
        <ellipse id="rand-orb2"   rx="4" ry="4" filter="url(#rand-glow2)"/>
        <ellipse id="rand-trail1" rx="3" ry="3" opacity="0.35"/>
        <ellipse id="rand-trail2" rx="2" ry="2" opacity="0.25"/>
      `;
      songItemEl.appendChild(svg);
      this._svg = svg;
      this._loop();
    },

    _loop() {
      if (!this._alive) return;
      this._raf = requestAnimationFrame(() => this._loop());
      this._t += 0.016;

      const el  = this._el;
      const svg = this._svg;
      if (!el || !svg) return;

      const rect = el.getBoundingClientRect();
      const W    = rect.width  + 8;
      const H    = rect.height + 8;
      const cx   = W * 0.5, cy = H * 0.5;
      const rx   = W * 0.5 - 2, ry = H * 0.5 - 2;

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      const a1 = this._t * 0.55;
      const a2 = a1 + Math.PI;
      const p1 = 1 + Math.sin(this._t * 2.1) * 0.3;
      const p2 = 1 + Math.sin(this._t * 1.7 + 1) * 0.3;
      const acc  = _s.themeAccent  || '#06b6d4';
      const acc2 = _s.themeAccent2 || '#3b82f6';

      const o1 = svg.querySelector('#rand-orb1');
      const o2 = svg.querySelector('#rand-orb2');
      const t1 = svg.querySelector('#rand-trail1');
      const t2 = svg.querySelector('#rand-trail2');

      const _set = (el, x, y, r, color, opacity) => {
        if (!el) return;
        el.setAttribute('cx', x); el.setAttribute('cy', y);
        el.setAttribute('rx', r); el.setAttribute('ry', r);
        el.setAttribute('fill', color);
        if (opacity !== undefined) el.setAttribute('opacity', opacity);
      };

      _set(o1, cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, 5.5 * p1, acc,  0.72 + Math.sin(this._t * 2.1) * 0.18);
      _set(o2, cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry, 4.5 * p2, acc2, 0.65 + Math.sin(this._t * 1.7) * 0.15);
      _set(t1, cx + Math.cos(a1 - 0.35) * rx, cy + Math.sin(a1 - 0.35) * ry, 3, acc);
      _set(t2, cx + Math.cos(a2 - 0.35) * rx, cy + Math.sin(a2 - 0.35) * ry, 2, acc2);
    },

    detach() {
      this._alive = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._el) {
        this._el.classList.remove('random-selected-active');
        this._el.querySelector('#random-orb-svg')?.remove();
      }
      if (this._svg?.parentNode) this._svg.remove();
      this._el = null;
      this._svg = null;
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  BACKWARD-COMPATIBILITY STUBS
  //
  //  HomeParticles and MusicVisualizer are removed in v3.
  //  Stubs prevent errors in any legacy call sites.
  // ─────────────────────────────────────────────────────────────
  const HomeParticles = {
    init() {}, start() {}, stop() {},
    toggle() {}, updateColors() {},
    _onQualityChange() {},
  };

  const MusicVisualizer = {
    init() {}, start() {}, stop() {}, resize() {},
    _on: false,
  };

  // ExpandAtmosphere alias → CinematicAtmosphere (used in script.js)
  const ExpandAtmosphere = {
    attachTo   (c) { CinematicAtmosphere.attachTo(c); },
    start (colors) { CinematicAtmosphere.start(colors); },
    stop       ()  { CinematicAtmosphere.destroy(); },
    updateColors(c){ CinematicAtmosphere.updateColors(c); },
  };

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────
  return {
    // Subsystem references (used by script.js)
    PerformanceMonitor,
    PaletteExtractor,
    AudioReactive,
    ThemeSync,
    HomeParticles,      // stub — no-op
    ExpandAtmosphere,   // alias for CinematicAtmosphere
    MusicVisualizer,    // stub — no-op
    ExpandPlayer,
    RandomSongAnim,

    /**
     * Bootstrap — called once from script.js after DOM ready.
     * Normal mode: lightweight. No canvas, no RAF, no cost.
     */
    init() {
      if (_s.initialized) return;
      _s.initialized = true;
      ThemeSync.refresh();
      console.log('[Atmosphere] Engine v3 ready (normal mode — zero cost)');
    },

    /**
     * Called when active song changes.
     * Normal mode: NO palette extraction, NO visual updates.
     * Immersive mode: handled inside ExpandPlayer.onSongChange().
     */
    onSongChange(song) {
      if (!song) return;
      // Only pass through to expand player if immersive is open
      if (ExpandPlayer.isOpen()) {
        ExpandPlayer.onSongChange(song);
      }
      // AudioReactive analyser handoff (non-blocking, only if already active)
      if (typeof state !== 'undefined' && state.analyser && AudioReactive.active) {
        AudioReactive.init(state.analyser);
      }
    },

    /** Called when play/pause state changes */
    onPlayStateChange(isPlaying) {
      if (isPlaying && AudioReactive._analyser && !AudioReactive.active) {
        AudioReactive.start();
      }
      ExpandPlayer._syncPlayBtn?.();
    },

    /** Called when accent theme changes */
    onThemeChange() {
      ThemeSync.refresh();
      if (ExpandPlayer.isOpen()) {
        const colors = ThemeSync.getPalette();
        CinematicAtmosphere.updateColors(colors);
      }
    },

    /**
     * Toggle atmosphere visuals (user setting).
     * In v3 this controls whether CinematicAtmosphere shows in immersive mode.
     */
    toggleParticles(enabled) {
      _s.atmosphereEnabled = !!enabled;
      if (!enabled && ExpandPlayer.isOpen()) {
        CinematicAtmosphere.pause();
      }
    },

    openExpand (song) { ExpandPlayer.open(song);   },
    closeExpand()     { ExpandPlayer.close();       },
    isExpandOpen()    { return ExpandPlayer.isOpen(); },

    attachRandomAnim(el) { RandomSongAnim.attach(el); },
    detachRandomAnim()   { RandomSongAnim.detach();   },
  };
})();

// Auto-init — deferred so script.js init() runs first
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => AtmosphereEngine.init(), 80));
} else {
  setTimeout(() => AtmosphereEngine.init(), 80);
}
