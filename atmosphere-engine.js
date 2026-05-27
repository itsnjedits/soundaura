/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║       SoundAura — Atmosphere Engine v2.0                  ║
 * ║  Cinematic · Organic · Music-Reactive · Theme-Unified     ║
 * ║                                                           ║
 * ║  Systems:                                                 ║
 * ║   PerformanceMonitor  — FPS tracking, quality scaling     ║
 * ║   PaletteExtractor    — k-means color from album art      ║
 * ║   AudioReactive       — Web Audio analyser → levels       ║
 * ║   ThemeSync           — Centralized theme color bridge    ║
 * ║   HomeParticles       — Organic drifting orbs, home screen║
 * ║   ExpandAtmosphere    — Immersive canvas: rays, particles ║
 * ║   MusicVisualizer     — Circular/waveform audio viz       ║
 * ║   ExpandPlayer        — Full-screen modal + all effects   ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const AtmosphereEngine = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // Shared internal state
  // ─────────────────────────────────────────────────────────
  const _s = {
    initialized: false,
    particlesOn: true,
    isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    palette: ['#06b6d4', '#3b82f6'],
    themeAccent:  '#06b6d4',
    themeAccent2: '#3b82f6',
    themeRgb: '6,182,212',
  };

  // ─────────────────────────────────────────────────────────
  // LERP / EASING HELPERS
  // ─────────────────────────────────────────────────────────
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ─────────────────────────────────────────────────────────
  // PERFORMANCE MONITOR
  // ─────────────────────────────────────────────────────────
  const PerformanceMonitor = {
    fps: 60,
    quality: 'high',
    _frames: 0,
    _lastTs: performance.now(),
    _timer: null,

    start() {
      if (_s.isMobile) this.quality = 'medium';
      this._timer = setInterval(() => this._measure(), 3000);
    },

    stop() { clearInterval(this._timer); },
    tick() { this._frames++; },

    _measure() {
      const now = performance.now();
      const elapsed = now - this._lastTs;
      this.fps = Math.min(Math.round((this._frames / elapsed) * 1000), 120);
      this._frames = 0;
      this._lastTs = now;
      this._applyQuality();
    },

    _applyQuality() {
      const prev = this.quality;
      if (_s.isMobile) {
        this.quality = this.fps >= 50 ? 'medium' : this.fps >= 35 ? 'low' : 'minimal';
      } else {
        this.quality = this.fps >= 55 ? 'high'
                     : this.fps >= 42 ? 'medium'
                     : this.fps >= 28 ? 'low'
                     : 'minimal';
      }
      if (prev !== this.quality) {
        console.log(`[Atmosphere] Quality: ${prev} → ${this.quality} (${this.fps}fps)`);
        HomeParticles._onQualityChange(this.quality);
      }
    },

    maxParticles() {
      const base = { high: 55, medium: 32, low: 18, minimal: 8 };
      return _s.isMobile ? Math.min((base[this.quality] || 18), 22) : (base[this.quality] || 32);
    },

    maxExpandParticles() {
      const base = { high: 80, medium: 48, low: 24, minimal: 12 };
      return _s.isMobile ? Math.min((base[this.quality] || 24), 32) : (base[this.quality] || 48);
    },

    maxRays() {
      const base = { high: 10, medium: 7, low: 5, minimal: 3 };
      return _s.isMobile ? Math.min((base[this.quality] || 5), 6) : (base[this.quality] || 7);
    },
  };

  // ─────────────────────────────────────────────────────────
  // PALETTE EXTRACTOR
  // ─────────────────────────────────────────────────────────
  const PaletteExtractor = {
    _cache: new Map(),
    SIZE: 48,

    extract(imageUrl, cb) {
      if (!imageUrl || imageUrl.startsWith('data:')) return cb(ThemeSync.getPalette());
      if (this._cache.has(imageUrl)) return cb(this._cache.get(imageUrl));
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const palette = this._fromImage(img);
          this._cache.set(imageUrl, palette);
          cb(palette);
        } catch(e) {
          cb(ThemeSync.getPalette());
        }
      };
      img.onerror = () => cb(ThemeSync.getPalette());
      img.src = imageUrl;
    },

    _fromImage(img) {
      const S = this.SIZE;
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, S, S);
      const d = cx.getImageData(0, 0, S, S).data;
      const pixels = [];
      for (let i = 0; i < d.length; i += 12) {
        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
        if (a < 100) continue;
        const br = (r + g + b) / 3;
        if (br > 235 || br < 20) continue;
        const sat = Math.max(r,g,b) - Math.min(r,g,b);
        if (sat < 20) continue;
        pixels.push([r, g, b]);
      }
      if (pixels.length < 8) return ThemeSync.getPalette();
      return this._kMeans(pixels, 4).map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
    },

    _kMeans(px, k) {
      const step = Math.floor(px.length / k);
      let centers = [];
      for (let i = 0; i < k; i++) centers.push([...px[i * step]]);
      for (let iter = 0; iter < 12; iter++) {
        const clusters = Array.from({ length: k }, () => []);
        for (const p of px) {
          let best = 0, bestD = Infinity;
          for (let c = 0; c < k; c++) {
            const d = this._dist(p, centers[c]);
            if (d < bestD) { bestD = d; best = c; }
          }
          clusters[best].push(p);
        }
        let converged = true;
        for (let c = 0; c < k; c++) {
          if (!clusters[c].length) continue;
          const nc = [
            Math.round(clusters[c].reduce((s,p) => s+p[0], 0) / clusters[c].length),
            Math.round(clusters[c].reduce((s,p) => s+p[1], 0) / clusters[c].length),
            Math.round(clusters[c].reduce((s,p) => s+p[2], 0) / clusters[c].length),
          ];
          if (this._dist(nc, centers[c]) > 2) converged = false;
          centers[c] = nc;
        }
        if (converged) break;
      }
      return centers;
    },

    _dist([r1,g1,b1],[r2,g2,b2]) {
      return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
    },
  };

  // ─────────────────────────────────────────────────────────
  // THEME SYNC — Centralized theme color bridge
  // All subsystems read from here, not from CSS directly
  // ─────────────────────────────────────────────────────────
  const ThemeSync = {
    _palette: null,

    refresh() {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      _s.themeAccent  = cs.getPropertyValue('--theme-accent').trim()  || '#06b6d4';
      _s.themeAccent2 = cs.getPropertyValue('--theme-accent2').trim() || '#3b82f6';
      _s.themeRgb     = cs.getPropertyValue('--theme-accent-rgb').trim() || '6,182,212';
      this._palette   = null; // invalidate cache
    },

    getPalette() {
      if (!this._palette) {
        this._palette = [_s.themeAccent, _s.themeAccent2];
      }
      return this._palette;
    },

    toRgba(color, alpha) {
      return _rgba(color, alpha);
    },

    glowColor(alpha = 0.25) {
      return `rgba(${_s.themeRgb},${alpha})`;
    },
  };

  // ─────────────────────────────────────────────────────────
  // AUDIO REACTIVE SYSTEM
  // ─────────────────────────────────────────────────────────
  const AudioReactive = {
    _analyser: null,
    _buf: null,
    _raf: null,
    active: false,

    // Smoothed output (0–1)
    bass: 0, mid: 0, high: 0, energy: 0,
    // Beat detection
    _beatCooldown: 0,
    onBeat: false,

    init(analyser) {
      if (!analyser) return;
      this._analyser = analyser;
      this._buf = new Uint8Array(analyser.frequencyBinCount);
      console.log('[Atmosphere] AudioReactive ready');
    },

    start() {
      if (this.active || !this._analyser) return;
      this.active = true;
      this._tick();
    },

    stop() {
      this.active = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    },

    _tick() {
      if (!this.active) return;
      this._raf = requestAnimationFrame(() => this._tick());
      this._analyser.getByteFrequencyData(this._buf);

      const n = this._buf.length;
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

      const α = 0.84;
      this.bass   = this.bass   * α + rawB * (1-α);
      this.mid    = this.mid    * α + rawM * (1-α);
      this.high   = this.high   * α + rawH * (1-α);
      this.energy = this.bass * 0.55 + this.mid * 0.30 + this.high * 0.15;

      // Simple beat detection
      if (this._beatCooldown > 0) this._beatCooldown--;
      if (rawB > 0.55 && this._beatCooldown === 0) {
        this.onBeat = true;
        this._beatCooldown = 12;
      } else {
        this.onBeat = false;
      }
    },
  };

  // ─────────────────────────────────────────────────────────
  // HOME SCREEN PARTICLE SYSTEM v2
  // Organic, drifting, breathing particles that feel alive.
  // Uses noise-like turbulence and smooth lerp motion.
  // ─────────────────────────────────────────────────────────
  const HomeParticles = {
    _cv: null,
    _cx: null,
    _pts: [],
    _raf: null,
    _on: false,
    _t: 0,
    _mx: -9999, _my: -9999,
    _colors: ['#06b6d4', '#3b82f6'],

    init() {
      if (this._cv) return;
      const cv = document.createElement('canvas');
      cv.id = 'atm-home-canvas';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = [
        'position:fixed','inset:0','width:100%','height:100%',
        'pointer-events:none','z-index:1','opacity:0.1',
        'will-change:transform',
      ].join(';');
      document.body.insertBefore(cv, document.body.firstChild);
      this._cv = cv;
      this._cx = cv.getContext('2d');
      this._resize();
      this._spawnAll(true);
      this._bindEvents();
      console.log('[Atmosphere] HomeParticles v2 initialized');
    },

    _resize() {
      if (!this._cv) return;
      this._cv.width  = window.innerWidth;
      this._cv.height = window.innerHeight;
    },

    _bindEvents() {
      window.addEventListener('resize', () => this._resize(), { passive: true });
      document.addEventListener('mousemove', e => { this._mx = e.clientX; this._my = e.clientY; }, { passive: true });
      document.addEventListener('mouseleave', () => { this._mx = -9999; this._my = -9999; }, { passive: true });
      document.addEventListener('touchmove', e => {
        if (e.touches[0]) { this._mx = e.touches[0].clientX; this._my = e.touches[0].clientY; }
      }, { passive: true });
      document.addEventListener('touchend', () => { this._mx = -9999; this._my = -9999; }, { passive: true });
    },

    _make(randomY = false) {
      const W = this._cv?.width  || window.innerWidth;
      const H = this._cv?.height || window.innerHeight;
      const layer = Math.random(); // 0=far, 1=close — affects size/blur/opacity
      const color = this._colors[Math.floor(Math.random() * this._colors.length)];
      return {
        x:   Math.random() * W,
        y:   randomY ? Math.random() * H : H + 20,
        // Target velocity (drifting)
        tvx: (Math.random() - 0.5) * 0.28,
        tvy: -(Math.random() * 0.22 + 0.05),
        // Actual velocity (lerped)
        vx: 0, vy: 0,
        // Turbulence phase
        tx: Math.random() * 1000,
        ty: Math.random() * 1000,
        txs: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
        tys: (Math.random() * 0.003 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
        // Appearance
        r:     layer * 2.2 + 0.5,      // close=bigger
        baseA: layer * 0.22 + 0.04,    // close=more visible
        a:     0,
        φ:     Math.random() * Math.PI * 2,
        φs:    Math.random() * 0.012 + 0.003,
        layer,
        color,
        // Fade-in
        born: 0,
      };
    },

    _spawnAll(randomY = false) {
      const count = PerformanceMonitor.maxParticles();
      this._pts = Array.from({ length: count }, () => this._make(randomY));
    },

    _draw() {
      if (!this._on) return;
      this._raf = requestAnimationFrame(() => this._draw());
      PerformanceMonitor.tick();

      const cx = this._cx;
      const W  = this._cv.width;
      const H  = this._cv.height;
      this._t += 0.008;

      // Adaptive fade: trails on calm, clean on beats
      const fadeAlpha = AudioReactive.onBeat ? 0.45 : 0.22;
      cx.fillStyle = `rgba(6,13,27,${fadeAlpha})`;
      cx.fillRect(0, 0, W, H);

      const eBoost = 1 + AudioReactive.energy * 2.0;
      const bPulse = AudioReactive.bass;
      const isBeat = AudioReactive.onBeat;

      for (let i = this._pts.length - 1; i >= 0; i--) {
        const p = this._pts[i];
        p.born = Math.min(1, p.born + 0.015);

        // Noise-like turbulence using sin(phase)
        p.tx += p.txs;
        p.ty += p.tys;
        const noiseX = Math.sin(p.tx * 3.7 + this._t) * 0.09;
        const noiseY = Math.cos(p.ty * 2.9 + this._t * 0.7) * 0.06;

        // Target velocity: base drift + turbulence
        const targetVx = p.tvx + noiseX;
        const targetVy = p.tvy + noiseY;

        // Soft mouse/touch attraction (very gentle)
        const dx = this._mx - p.x;
        const dy = this._my - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        let attrX = 0, attrY = 0;
        if (dist < 120 && dist > 1) {
          const f = (120 - dist) / 120 * 0.006;
          attrX = (dx / dist) * f;
          attrY = (dy / dist) * f;
        }

        // Lerp velocity toward target (organic feel)
        p.vx = lerp(p.vx, targetVx + attrX, 0.04);
        p.vy = lerp(p.vy, targetVy + attrY, 0.04);

        // On beat: burst outward
        const beatExpand = isBeat ? (1 + p.layer * 1.8) : 1;
        p.x += p.vx * eBoost * beatExpand;
        p.y += p.vy * eBoost * beatExpand;

        // Breathing alpha — brighter on beats
        p.φ += p.φs;
        const breathe = Math.sin(p.φ) * 0.12;
        const beatBright = isBeat ? p.layer * 0.25 : 0;
        const targetA = (p.baseA + breathe + bPulse * p.layer * 0.18 + beatBright) * p.born;
        p.a = lerp(p.a, targetA, 0.06);

        // Draw soft glowing orb — layered radial gradient
        const beatSz = isBeat ? (1 + p.layer * 0.55) : 1;
        const r = p.r * (1 + bPulse * p.layer * 0.6) * beatSz;
        const outerR = r * (4 + p.layer * 3);
        const grad = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
        grad.addColorStop(0,    _rgba(p.color, p.a * 1.8));
        grad.addColorStop(0.25, _rgba(p.color, p.a * 0.7));
        grad.addColorStop(0.6,  _rgba(p.color, p.a * 0.18));
        grad.addColorStop(1,    _rgba(p.color, 0));
        cx.beginPath();
        cx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        cx.fillStyle = grad;
        cx.fill();

        // Recycle
        if (p.y < -40 || p.x < -80 || p.x > W + 80) {
          const np = this._make(false);
          np.x = Math.random() * W;
          this._pts[i] = np;
        }
      }
    },

    start() {
      if (!this._cv) this.init();
      if (this._on) return;
      this._on = true;
      this._cv.style.display = '';
      this._draw();
      console.log('[Atmosphere] HomeParticles ON');
    },

    stop() {
      this._on = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._cv) this._cv.style.display = 'none';
      console.log('[Atmosphere] HomeParticles OFF');
    },

    toggle(enabled) { enabled ? this.start() : this.stop(); },

    updateColors(colors) {
      if (!colors || !colors.length) return;
      this._colors = colors;
      // Smoothly transition particle colors over time
      this._pts.forEach((p, i) => {
        if (Math.random() < 0.4) {
          p.color = colors[Math.floor(Math.random() * colors.length)];
        }
      });
    },

    _onQualityChange(q) {
      if (!this._on) return;
      const target = PerformanceMonitor.maxParticles();
      const cur = this._pts.length;
      if (target < cur) {
        this._pts = this._pts.slice(0, target);
      } else {
        for (let i = 0; i < target - cur; i++) this._pts.push(this._make(true));
      }
    },
  };

  // ─────────────────────────────────────────────────────────
  // EXPAND MODE ATMOSPHERE v2
  // Cinematic light rays + layered particles + ambient blobs
  // Everything feels like "music floating through air"
  // ─────────────────────────────────────────────────────────
  const ExpandAtmosphere = {
    _cv: null,
    _cx: null,
    _pts: [],
    _glows: [],
    _rays: [],
    _raf: null,
    _on: false,
    _t: 0,
    _colors: ['#06b6d4', '#3b82f6'],

    attachTo(container) {
      if (this._cv) { container.appendChild(this._cv); return; }
      const cv = document.createElement('canvas');
      cv.id = 'atm-expand-canvas';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;border-radius:inherit;';
      container.appendChild(cv);
      this._cv = cv;
      this._cx = cv.getContext('2d');
    },

    start(colors) {
      if (colors && colors.length) this._colors = colors;
      if (!this._cv) return;
      this._cv.width  = this._cv.offsetWidth  || window.innerWidth;
      this._cv.height = this._cv.offsetHeight || window.innerHeight;
      this._spawnAll();
      this._on = true;
      this._t  = 0;
      this._draw();
      AudioReactive.start();
      console.log('[Atmosphere] ExpandAtmosphere v2 ON');
    },

    stop() {
      this._on = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      AudioReactive.stop();
      console.log('[Atmosphere] ExpandAtmosphere OFF');
    },

    _spawnAll() {
      const W = this._cv.width, H = this._cv.height;
      const pN = PerformanceMonitor.maxExpandParticles();

      // Particles — originate from center area, spread outward
      this._pts = Array.from({ length: pN }, () => this._makeParticle(W, H, true));

      // Ambient glow blobs — large, slow, soft
      const gN = _s.isMobile ? 4 : 6;
      this._glows = Array.from({ length: gN }, () => ({
        x:  Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r:  Math.random() * 120 + 80,
        a:  Math.random() * 0.07 + 0.02,
        φ:  Math.random() * Math.PI * 2,
        φs: Math.random() * 0.005 + 0.001,
        color: this._colors[Math.floor(Math.random() * this._colors.length)],
      }));

      // Rays — defined by angle, rendered as soft fan shapes
      const rN = PerformanceMonitor.maxRays();
      this._rays = Array.from({ length: rN }, (_, i) => ({
        angle:  (i / rN) * Math.PI * 2 + Math.random() * 0.4,
        rotV:   (Math.random() - 0.5) * 0.0006,  // very slow rotation
        len:    Math.random() * 0.3 + 0.35,       // fraction of screen diagonal
        width:  Math.random() * 0.12 + 0.06,      // arc width in radians
        a:      Math.random() * 0.025 + 0.008,
        φ:      Math.random() * Math.PI * 2,
        φs:     Math.random() * 0.004 + 0.001,
        color:  this._colors[i % this._colors.length],
      }));
    },

    _makeParticle(W, H, spread = false) {
      const cx = W * 0.5, cy = H * 0.42;
      const angle = Math.random() * Math.PI * 2;
      const dist  = spread
        ? Math.random() * Math.max(W, H) * 0.6
        : Math.random() * 40;  // spawn near center
      const layer = Math.random();
      return {
        x:   cx + Math.cos(angle) * dist,
        y:   cy + Math.sin(angle) * dist,
        vx:  Math.cos(angle) * (Math.random() * 0.18 + 0.04),
        vy:  Math.sin(angle) * (Math.random() * 0.18 + 0.04),
        tvx: Math.cos(angle) * (Math.random() * 0.22 + 0.05),
        tvy: Math.sin(angle) * (Math.random() * 0.22 + 0.05) - 0.05,
        r:   layer * 2.5 + 0.5,
        a:   0,
        baseA: layer * 0.28 + 0.06,
        φ:   Math.random() * Math.PI * 2,
        φs:  Math.random() * 0.015 + 0.004,
        layer,
        born: spread ? 1 : 0,
        color: this._colors[Math.floor(Math.random() * this._colors.length)],
        // Turbulence
        tx: Math.random() * 1000, ty: Math.random() * 1000,
        txs: (Math.random() * 0.005 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
        tys: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
      };
    },

    _draw() {
      if (!this._on) return;
      this._raf = requestAnimationFrame(() => this._draw());
      PerformanceMonitor.tick();

      const cx = this._cx;
      const W  = this._cv.width, H = this._cv.height;
      this._t += 0.010;

      // Adaptive motion-blur clear — trails on calm, sharp on beats
      const fadeA = AudioReactive.onBeat ? 0.32 : 0.15;
      cx.fillStyle = `rgba(6,13,27,${fadeA})`;
      cx.fillRect(0, 0, W, H);

      const eBoost = 1 + AudioReactive.energy * 2.2;
      const bPulse = AudioReactive.bass;
      const isBeat = AudioReactive.onBeat;
      const q = PerformanceMonitor.quality;

      // ── 1. Ambient glow blobs ─────────────────────────────
      for (const g of this._glows) {
        g.φ += g.φs;
        g.x += g.vx; g.y += g.vy;
        // Wrap
        if (g.x < -g.r) g.x = W + g.r;
        if (g.x > W + g.r) g.x = -g.r;
        if (g.y < -g.r) g.y = H + g.r;
        if (g.y > H + g.r) g.y = -g.r;

        const pulse = 1 + Math.sin(g.φ) * 0.22;
        const r = g.r * pulse * (1 + bPulse * 0.3);
        const a = g.a * (1 + AudioReactive.mid * 0.6);

        const grad = cx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
        grad.addColorStop(0,    _rgba(g.color, a));
        grad.addColorStop(0.4,  _rgba(g.color, a * 0.3));
        grad.addColorStop(1,    _rgba(g.color, 0));
        cx.beginPath();
        cx.arc(g.x, g.y, r, 0, Math.PI * 2);
        cx.fillStyle = grad;
        cx.fill();
      }

      // ── 2. Cinematic light rays ───────────────────────────
      if (q !== 'minimal') {
        // Rays emit from center (album art position)
        const rCx = W * 0.5, rCy = H * 0.42;
        const diag = Math.sqrt(W*W + H*H);

        cx.save();
        for (const ray of this._rays) {
          ray.angle += ray.rotV;
          ray.φ += ray.φs;

          const beatBoost = 1 + bPulse * 0.8 + AudioReactive.high * 0.3;
          const breathe   = 1 + Math.sin(ray.φ) * 0.18;
          const trebleFlicker = 1 + AudioReactive.high * (Math.sin(this._t * 18 + ray.φ) * 0.4);
          const rayLen    = diag * ray.len * beatBoost * breathe;
          const halfArc   = ray.width * 0.5 * (beatBoost + AudioReactive.mid * 0.3);
          const alpha     = ray.a * breathe * (1 + bPulse * 0.7) * trebleFlicker;

          const x2 = rCx + Math.cos(ray.angle) * rayLen;
          const y2 = rCy + Math.sin(ray.angle) * rayLen;

          // Build ray as a very soft fan using linear gradient
          // Perpendicular spread
          const perpX = -Math.sin(ray.angle) * rayLen * Math.tan(halfArc);
          const perpY =  Math.cos(ray.angle) * rayLen * Math.tan(halfArc);

          const grad = cx.createLinearGradient(rCx, rCy, x2, y2);
          grad.addColorStop(0,   _rgba(ray.color, alpha));
          grad.addColorStop(0.35,_rgba(ray.color, alpha * 0.55));
          grad.addColorStop(0.7, _rgba(ray.color, alpha * 0.18));
          grad.addColorStop(1,   _rgba(ray.color, 0));

          cx.beginPath();
          cx.moveTo(rCx, rCy);
          cx.lineTo(x2 + perpX, y2 + perpY);
          cx.lineTo(x2 - perpX, y2 - perpY);
          cx.closePath();
          cx.fillStyle = grad;
          cx.fill();
        }
        cx.restore();

        // Soft center bloom — halo around album art origin
        const bloomR  = 60 + bPulse * 80;
        const bloomA  = 0.04 + bPulse * 0.06;
        const bloom   = cx.createRadialGradient(rCx, rCy, 0, rCx, rCy, bloomR);
        bloom.addColorStop(0,   _rgba(this._colors[0], bloomA * 2));
        bloom.addColorStop(0.5, _rgba(this._colors[0], bloomA));
        bloom.addColorStop(1,   _rgba(this._colors[0], 0));
        cx.beginPath();
        cx.arc(rCx, rCy, bloomR, 0, Math.PI * 2);
        cx.fillStyle = bloom;
        cx.fill();
      }

      // ── 3. Organic particles ──────────────────────────────
      const W2 = W * 0.5, H2 = H * 0.42;
      for (let i = this._pts.length - 1; i >= 0; i--) {
        const p = this._pts[i];
        p.born = Math.min(1, p.born + 0.012);
        p.φ  += p.φs;
        p.tx += p.txs;
        p.ty += p.tys;

        // Turbulence
        const noiseX = Math.sin(p.tx * 3.1 + this._t) * 0.06;
        const noiseY = Math.cos(p.ty * 2.7 + this._t * 0.8) * 0.05;

        p.vx = lerp(p.vx, p.tvx + noiseX, 0.035);
        p.vy = lerp(p.vy, p.tvy + noiseY, 0.035);

        // Beat: burst expand
        const beatMult = isBeat ? (1 + p.layer * 2.2) : 1;
        p.x += p.vx * eBoost * beatMult;
        p.y += p.vy * eBoost * beatMult;

        // Breathing alpha — brighter and wider on beats
        const breathe   = Math.sin(p.φ) * 0.15;
        const beatGlow  = isBeat ? p.layer * 0.3 : 0;
        const targetA   = (p.baseA + breathe + bPulse * p.layer * 0.2 + beatGlow) * p.born;
        p.a = lerp(p.a, targetA, 0.05);

        // Draw layered soft orb — bigger on beats
        const beatSz = isBeat ? (1 + p.layer * 0.7) : 1;
        const r = p.r * (1 + bPulse * p.layer * 0.7) * beatSz;
        const or = r * (3.5 + p.layer * 4);
        const grad = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, or);
        grad.addColorStop(0,    _rgba(p.color, p.a * 2.0));
        grad.addColorStop(0.2,  _rgba(p.color, p.a * 1.0));
        grad.addColorStop(0.55, _rgba(p.color, p.a * 0.25));
        grad.addColorStop(1,    _rgba(p.color, 0));
        cx.beginPath();
        cx.arc(p.x, p.y, or, 0, Math.PI * 2);
        cx.fillStyle = grad;
        cx.fill();

        // Recycle: if too far from visible area, respawn near center
        const dx = p.x - W2, dy = p.y - H2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > Math.max(W, H) * 0.85) {
          this._pts[i] = this._makeParticle(W, H, false);
        }
      }

      // ── 4. Beat-reactive center luminance pulse ───────────
      if (bPulse > 0.06) {
        const lR  = 45 + bPulse * 110;
        const lA  = bPulse * 0.12;
        const c   = this._colors[0] || '#06b6d4';
        const lg  = cx.createRadialGradient(W*0.5, H*0.42, 0, W*0.5, H*0.42, lR);
        lg.addColorStop(0,   _rgba(c, lA * 1.5));
        lg.addColorStop(0.6, _rgba(c, lA));
        lg.addColorStop(1,   _rgba(c, 0));
        cx.beginPath();
        cx.arc(W*0.5, H*0.42, lR, 0, Math.PI * 2);
        cx.fillStyle = lg;
        cx.fill();
      }
    },

    updateColors(colors) {
      if (!colors || !colors.length) return;
      this._colors = colors;
      this._pts  .forEach((p, i) => { if (Math.random() < 0.5) p.color = colors[Math.floor(Math.random()*colors.length)]; });
      this._glows.forEach(g => { g.color = colors[Math.floor(Math.random()*colors.length)]; });
      this._rays .forEach((r, i) => { r.color = colors[i % colors.length]; });
    },

    resize() {
      if (!this._cv) return;
      this._cv.width  = this._cv.offsetWidth  || window.innerWidth;
      this._cv.height = this._cv.offsetHeight || window.innerHeight;
    },
  };

  // ─────────────────────────────────────────────────────────
  // INVERTED BAR VISUALIZER
  // Cinematic downward-growing bars, placed below EP controls.
  // Fully audio-reactive via Web Audio API analyser.
  // ─────────────────────────────────────────────────────────
  const MusicVisualizer = {
    _cv: null,
    _cx: null,
    _wrap: null,
    _raf: null,
    _on: false,
    _t: 0,
    _smoothBuf: null,
    _BARS: 64,

    init(wrapEl) {
      // wrapEl is the container div below controls
      if (this._wrap === wrapEl && this._cv) return;
      this._wrap = wrapEl;

      // Remove old canvas if reiniting
      const old = wrapEl.querySelector('#ep-bar-viz-canvas');
      if (old) old.remove();

      const cv = document.createElement('canvas');
      cv.id = 'ep-bar-viz-canvas';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = [
        'display:block',
        'width:100%',
        'height:100%',
        'pointer-events:none',
      ].join(';');
      wrapEl.appendChild(cv);
      this._cv = cv;
      this._cx  = cv.getContext('2d');
      this.resize();
    },

    resize() {
      if (!this._cv || !this._wrap) return;
      this._cv.width  = this._wrap.offsetWidth  || 360;
      this._cv.height = this._wrap.offsetHeight || 80;
    },

    start() {
      if (!this._cv || this._on) return;
      this._on = true;
      this._draw();
    },

    stop() {
      this._on = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._cx && this._cv) {
        this._cx.clearRect(0, 0, this._cv.width, this._cv.height);
      }
    },

    _draw() {
      if (!this._on) return;
      this._raf = requestAnimationFrame(() => this._draw());
      const cx = this._cx;
      if (!cx || !this._cv) return;

      // Keep canvas size in sync with container
      if (this._wrap) {
        const w = this._wrap.offsetWidth;
        const h = this._wrap.offsetHeight;
        if (this._cv.width !== w || this._cv.height !== h) {
          this._cv.width  = w || 360;
          this._cv.height = h || 80;
        }
      }

      const W = this._cv.width, H = this._cv.height;
      this._t += 0.015;
      cx.clearRect(0, 0, W, H);

      const analyser = typeof state !== 'undefined' ? state.analyser : null;

      // Smooth buffer
      const BARS = this._BARS;
      if (!this._smoothBuf || this._smoothBuf.length !== BARS) {
        this._smoothBuf = new Float32Array(BARS).fill(0);
      }

      if (analyser) {
        const raw = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(raw);
        for (let i = 0; i < BARS; i++) {
          const idx = Math.floor((i / BARS) * raw.length * 0.65);
          this._smoothBuf[i] = lerp(this._smoothBuf[i], raw[idx] / 255, 0.18);
        }
      } else {
        // Idle breathing animation
        for (let i = 0; i < BARS; i++) {
          const idle = Math.sin(this._t * 1.5 + i * 0.3) * 0.08 + 0.05;
          this._smoothBuf[i] = lerp(this._smoothBuf[i], idle, 0.04);
        }
      }

      const c1  = _s.themeAccent  || '#06b6d4';
      const c2  = _s.themeAccent2 || '#3b82f6';
      const rgb = _s.themeRgb     || '6,182,212';
      const bPulse = AudioReactive.bass;

      const GAP      = 2;
      const barW     = (W - (BARS - 1) * GAP) / BARS;
      const maxBarH  = H * 0.92;
      const cornerR  = Math.min(barW / 2, 3.5);

      for (let i = 0; i < BARS; i++) {
        const amp    = clamp(this._smoothBuf[i] * (1 + bPulse * 0.45), 0, 1);
        const barH   = amp * maxBarH + 2;
        const x      = i * (barW + GAP);
        const y      = 0;  // bars grow downward from top

        // Gradient: bright top → deeper color at bottom
        const grad = cx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, _rgba(c1, 0.9 + amp * 0.1));
        grad.addColorStop(0.5, _rgba(c2, 0.65));
        grad.addColorStop(1, _rgba(c2, 0.2));
        cx.fillStyle = grad;

        // Rounded bottom corners
        cx.beginPath();
        cx.moveTo(x, y);
        cx.lineTo(x + barW, y);
        cx.lineTo(x + barW, y + barH - cornerR);
        cx.arcTo(x + barW, y + barH, x + barW - cornerR, y + barH, cornerR);
        cx.lineTo(x + cornerR, y + barH);
        cx.arcTo(x, y + barH, x, y + barH - cornerR, cornerR);
        cx.lineTo(x, y);
        cx.closePath();
        cx.fill();

        // Glow on active bars
        if (amp > 0.45) {
          cx.shadowColor = `rgba(${rgb},${0.25 + amp * 0.35})`;
          cx.shadowBlur  = 6 + amp * 10;
          cx.fill();
          cx.shadowBlur  = 0;
        }
      }

      // Subtle separator line at the top
      cx.fillStyle = `rgba(${rgb},0.12)`;
      cx.fillRect(0, 0, W, 1);
    },
  };

  // ─────────────────────────────────────────────────────────
  // EXPAND PLAYER MODAL v2
  // Full-screen immersive player. Better album art handling.
  // Integrated atmosphere + circular visualizer.
  // ─────────────────────────────────────────────────────────
  const ExpandPlayer = {
    _modal: null,
    _open:  false,
    _song:  null,
    _progRaf: null,
    _artContain: false,  // "expand mode" — show full image

    _build() {
      const m = document.createElement('div');
      m.id = 'expand-player-modal';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', 'Expanded player');
      m.style.cssText = [
        'position:fixed','inset:0','z-index:48',
        'display:flex','flex-direction:column',
        'align-items:center','justify-content:center',
        'background:rgba(4,10,22,0.97)',
        'opacity:0','transition:opacity 0.36s cubic-bezier(0.25,0.46,0.45,0.94)',
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

        <!-- Atmosphere canvas layer -->

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
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <!-- Album Art Wrapper — has visualizer canvas on top -->
          <div id="ep-art-wrap" style="
            position:relative;
            width:clamp(190px,58vmin,270px);
            height:clamp(190px,58vmin,270px);
            border-radius:1.75rem;overflow:visible;
            flex-shrink:0;
          ">
            <!-- Visualizer canvas — sits around the art -->
            <!-- Art container — inner clip -->
            <div id="ep-art-inner" style="
              position:absolute;inset:0;
              border-radius:1.75rem;overflow:hidden;
              box-shadow:0 32px 80px rgba(0,0,0,0.75);
              transition:box-shadow 0.4s ease;
            ">
              <img id="ep-art" src="" alt="Album art" style="
                width:100%;height:100%;
                object-fit:cover;
                display:block;
                transition:object-fit 0.3s ease;
              " />
            </div>

            <!-- Expand/contain mode toggle -->
            <button id="ep-art-mode-btn" title="Toggle full image" style="
              position:absolute;top:-0.5rem;left:-0.5rem;
              width:1.8rem;height:1.8rem;border-radius:50%;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(0,0,0,0.55);
              color:rgba(255,255,255,0.6);font-size:0.65rem;
              cursor:pointer;display:flex;align-items:center;justify-content:center;
              transition:all 0.15s ease;backdrop-filter:blur(8px);z-index:4;
            " title="Toggle image fit">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
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
              margin-bottom:0.28rem;
              text-shadow:none;
              transition:background 0.4s ease;
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
              <!-- Thumb dot -->
              <div id="ep-prog-thumb" style="
                position:absolute;top:50%;transform:translate(-50%,-50%);
                width:10px;height:10px;border-radius:50%;
                background:white;opacity:0;
                pointer-events:none;transition:opacity 0.15s;
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button id="ep-play" style="
              width:3.8rem;height:3.8rem;border-radius:50%;border:none;
              background:linear-gradient(135deg,var(--theme-accent,#06b6d4),var(--theme-accent2,#3b82f6));
              color:white;cursor:pointer;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 0 32px rgba(var(--theme-accent-rgb,6,182,212),0.35),
                         0 6px 20px rgba(0,0,0,0.4);
              transition:all 0.18s ease;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <button id="ep-next" title="Next" style="
              width:2.7rem;height:2.7rem;border-radius:50%;
              border:1px solid rgba(255,255,255,0.1);
              background:rgba(255,255,255,0.05);
              color:#8b9ab5;cursor:pointer;
              display:flex;align-items:center;justify-content:center;
              transition:all 0.18s ease;backdrop-filter:blur(6px);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
            </button>
          </div>

          <!-- Inverted Bar Visualizer — grows downward, cinematic -->
          <div id="ep-viz-wrap" style="
            width:100%;max-width:360px;
            height:clamp(60px,12vh,90px);
            margin-top:0.4rem;
            border-radius:0.5rem;
            overflow:hidden;
            opacity:0.88;
          "></div>

        </div>
      `;

      document.body.appendChild(m);
      this._modal = m;
      ExpandAtmosphere.attachTo(m);
      // Init bar visualizer into its dedicated wrap below controls
      const vizWrap = m.querySelector('#ep-viz-wrap');
      if (vizWrap) MusicVisualizer.init(vizWrap);
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

      // Art mode toggle (cover ↔ contain)
      m.querySelector('#ep-art-mode-btn')?.addEventListener('click', () => {
        this._artContain = !this._artContain;
        const img  = m.querySelector('#ep-art');
        const wrap = m.querySelector('#ep-art-inner');
        if (img) img.style.objectFit = this._artContain ? 'contain' : 'cover';
        if (wrap) {
          wrap.style.background = this._artContain ? 'rgba(4,10,22,0.7)' : 'transparent';
        }
      });

      // Progress scrub
      const bar   = m.querySelector('#ep-prog-bar');
      const thumb = m.querySelector('#ep-prog-thumb');
      if (bar) {
        const scrub = (cx2) => {
          const rect = bar.getBoundingClientRect();
          const pct  = clamp((cx2 - rect.left) / rect.width, 0, 1);
          const el   = window._soundAuraAudio;
          if (el && el.duration) el.currentTime = pct * el.duration;
        };
        bar.addEventListener('click', e => scrub(e.clientX));
        bar.addEventListener('touchstart', e => { e.preventDefault(); scrub(e.touches[0].clientX); }, { passive: false });
        bar.addEventListener('touchmove',  e => { e.preventDefault(); scrub(e.touches[0].clientX); }, { passive: false });
        bar.addEventListener('mouseenter', () => {
          bar.style.height = '5px';
          if (thumb) thumb.style.opacity = '1';
        });
        bar.addEventListener('mouseleave', () => {
          bar.style.height = '3px';
          if (thumb) thumb.style.opacity = '0';
        });
        // Update thumb position
        bar.addEventListener('mousemove', e => {
          if (!thumb) return;
          const rect = bar.getBoundingClientRect();
          const pct  = clamp((e.clientX - rect.left) / rect.width, 0, 1);
          thumb.style.left = `${pct * 100}%`;
        });
      }

      // Esc to close
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this._open) this.close();
      });

      // Hover glow on control buttons
      [m.querySelector('#ep-prev'), m.querySelector('#ep-next')].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('mouseenter', () => {
          btn.style.color   = _s.themeAccent;
          btn.style.borderColor = _rgba(_s.themeAccent, 0.4);
          btn.style.boxShadow   = `0 0 16px ${_rgba(_s.themeAccent, 0.2)}`;
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.color   = '';
          btn.style.borderColor = '';
          btn.style.boxShadow   = '';
        });
      });
    },

    open(song) {
      console.log('[Expand] Opening:', song?.title);
      if (!this._modal) this._build();
      this._song = song;
      this._open = true;
      this._modal.style.display = 'flex';
      requestAnimationFrame(() => { this._modal.style.opacity = '1'; });
      document.body.style.overflow = 'hidden';

      if (song) this._updateUI(song);

      const imgUrl = song?.image || '';
      PaletteExtractor.extract(imgUrl, palette => {
        _s.palette = palette;
        ExpandAtmosphere.updateColors(palette);
        ExpandAtmosphere.start(palette);
        this._applyGlow(palette);
      });

      if (typeof state !== 'undefined' && state.analyser) {
        AudioReactive.init(state.analyser);
        AudioReactive.start();
      }

      // Ensure viz is initialized (may have been rebuilt)
      const vizWrap = this._modal?.querySelector('#ep-viz-wrap');
      if (vizWrap && (!MusicVisualizer._cv || !MusicVisualizer._cv.isConnected)) {
        MusicVisualizer.init(vizWrap);
      }
      MusicVisualizer.start();
      this._startProgSync();
      this._syncPlayBtn();
    },

    close() {
      if (!this._open) return;
      console.log('[Expand] Closing');
      this._open = false;
      if (this._modal) {
        this._modal.style.opacity = '0';
        setTimeout(() => { if (this._modal) this._modal.style.display = 'none'; }, 360);
      }
      ExpandAtmosphere.stop();
      MusicVisualizer.stop();
      this._stopProgSync();
      document.body.style.overflow = '';
    },

    _updateUI(song) {
      const m = this._modal; if (!m) return;
      const artists = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '—');
      const t   = m.querySelector('#ep-title');
      const a   = m.querySelector('#ep-artist');
      const img = m.querySelector('#ep-art');
      const bg  = m.querySelector('#ep-bg-blur');

      // Force synchronous update — avoid any stale closure issues
      requestAnimationFrame(() => {
        if (t)   t.textContent   = song.title  || 'Unknown';
        if (a)   a.textContent   = artists;

        if (img) {
          // Clear src first to force image reload even for same URL
          img.src = '';
          img.onerror = () => { img.src = ''; };
          img.onload  = () => { img.style.opacity = '1'; };
          img.style.opacity = '0.85';
          // Use rAF to ensure blank frame before new src
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
      const m = this._modal; if (!m || !palette.length) return;
      const inner = m.querySelector('#ep-art-inner');
      const c = palette[0];
      if (inner) {
        const semi = _rgba(c, 0.3);
        inner.style.boxShadow = `0 32px 80px rgba(0,0,0,0.75), 0 0 70px ${semi}`;
      }
      // Update title gradient to match palette
      const title = m.querySelector('#ep-title');
      if (title && palette.length >= 2) {
        const c2 = palette[1] || palette[0];
        title.style.background = `linear-gradient(110deg,#e8f4ff,${c},${c2})`;
        title.style.webkitBackgroundClip = 'text';
        title.style.backgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
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
        if (fill) fill.style.width = `${pct}%`;
        if (cur)  cur.textContent  = _fmtTime(el.currentTime);
        if (tot)  tot.textContent  = _fmtTime(el.duration || 0);
      };
      tick();
    },

    _stopProgSync() {
      if (this._progRaf) { cancelAnimationFrame(this._progRaf); this._progRaf = null; }
    },

    _syncPlayBtn() {
      const btn = this._modal?.querySelector('#ep-play');
      if (!btn) return;
      const el = window._soundAuraAudio;
      const playing = el && !el.paused;
      btn.innerHTML = playing
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    },

    onSongChange(song) {
      this._song = song;
      if (!this._open || !song) return;

      // Update all UI elements immediately
      this._updateUI(song);

      // Re-sync play button state
      setTimeout(() => this._syncPlayBtn(), 120);

      // Update atmosphere colors from new album art
      const imgUrl = song.image || '';
      PaletteExtractor.extract(imgUrl, palette => {
        _s.palette = palette;
        ExpandAtmosphere.updateColors(palette);
        this._applyGlow(palette);
        // Re-init AudioReactive if analyser available
        if (typeof state !== 'undefined' && state.analyser) {
          AudioReactive.init(state.analyser);
          if (!AudioReactive.active) AudioReactive.start();
        }
      });

      // Ensure visualizer is still running
      if (!MusicVisualizer._on) MusicVisualizer.start();
    },

    isOpen() { return this._open; },
  };

  // ─────────────────────────────────────────────────────────
  // RANDOM SONG HIGHLIGHT ANIMATION
  // Two soft orbs rotate around the highlighted song item.
  // Runs continuously until user interaction. DOM injection.
  // ─────────────────────────────────────────────────────────
  const RandomSongAnim = {
    _el: null,           // the song item element
    _raf: null,
    _svgEl: null,
    _t: 0,
    _active: false,

    attach(songItemEl) {
      this.detach();
      if (!songItemEl) return;
      this._el = songItemEl;
      this._t  = 0;
      this._active = true;

      // Add persistent glow class
      songItemEl.classList.add('random-selected-active');

      // Create overlay SVG for orbs
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'random-orb-svg';
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = [
        'position:absolute','inset:-4px','width:calc(100% + 8px)','height:calc(100% + 8px)',
        'pointer-events:none','z-index:10','overflow:visible',
        'border-radius:inherit',
      ].join(';');

      // Soft glow filter
      svg.innerHTML = `
        <defs>
          <filter id="rand-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="rand-glow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <ellipse id="rand-orb1" rx="6" ry="6" filter="url(#rand-glow)"/>
        <ellipse id="rand-orb2" rx="4" ry="4" filter="url(#rand-glow2)"/>
        <ellipse id="rand-trail1" rx="3" ry="3" opacity="0.35"/>
        <ellipse id="rand-trail2" rx="2" ry="2" opacity="0.25"/>
      `;

      // Make the song item position:relative if not already
      const pos = getComputedStyle(songItemEl).position;
      if (pos === 'static') songItemEl.style.position = 'relative';
      songItemEl.appendChild(svg);
      this._svgEl = svg;

      this._animate();
    },

    _animate() {
      if (!this._active) return;
      this._raf = requestAnimationFrame(() => this._animate());
      this._t += 0.016;

      const el  = this._el;
      const svg = this._svgEl;
      if (!el || !svg) return;

      const rect = el.getBoundingClientRect();
      const W    = rect.width  + 8;   // SVG is 8px wider than item
      const H    = rect.height + 8;
      const cx   = W * 0.5;
      const cy   = H * 0.5;
      const rx   = W * 0.5 - 2;       // orbit ellipse radii
      const ry   = H * 0.5 - 2;

      // Update SVG dimensions in case el resized
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      // Orb 1: slower orbit, uses theme accent
      const a1 = this._t * 0.55;
      const x1 = cx + Math.cos(a1) * rx;
      const y1 = cy + Math.sin(a1) * ry;

      // Orb 2: opposite side, slightly faster
      const a2 = this._t * 0.55 + Math.PI;
      const x2 = cx + Math.cos(a2) * rx;
      const y2 = cy + Math.sin(a2) * ry;

      // Trail behind each orb
      const a1t = a1 - 0.35;
      const a2t = a2 - 0.35;

      const acc  = _s.themeAccent  || '#06b6d4';
      const acc2 = _s.themeAccent2 || '#3b82f6';

      const o1 = svg.querySelector('#rand-orb1');
      const o2 = svg.querySelector('#rand-orb2');
      const t1 = svg.querySelector('#rand-trail1');
      const t2 = svg.querySelector('#rand-trail2');

      const pulse1 = 1 + Math.sin(this._t * 2.1) * 0.3;
      const pulse2 = 1 + Math.sin(this._t * 1.7 + 1) * 0.3;

      if (o1) {
        o1.setAttribute('cx', x1);
        o1.setAttribute('cy', y1);
        o1.setAttribute('rx', 5.5 * pulse1); o1.setAttribute('ry', 5.5 * pulse1);
        o1.setAttribute('fill', acc);
        o1.setAttribute('opacity', 0.72 + Math.sin(this._t * 2.1) * 0.18);
      }
      if (o2) {
        o2.setAttribute('cx', x2);
        o2.setAttribute('cy', y2);
        o2.setAttribute('rx', 4.5 * pulse2); o2.setAttribute('ry', 4.5 * pulse2);
        o2.setAttribute('fill', acc2);
        o2.setAttribute('opacity', 0.65 + Math.sin(this._t * 1.7) * 0.15);
      }
      if (t1) {
        t1.setAttribute('cx', cx + Math.cos(a1t) * rx);
        t1.setAttribute('cy', cy + Math.sin(a1t) * ry);
        t1.setAttribute('fill', acc);
      }
      if (t2) {
        t2.setAttribute('cx', cx + Math.cos(a2t) * rx);
        t2.setAttribute('cy', cy + Math.sin(a2t) * ry);
        t2.setAttribute('fill', acc2);
      }
    },

    detach() {
      this._active = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._el) {
        this._el.classList.remove('random-selected-active');
        const oldSvg = this._el.querySelector('#random-orb-svg');
        if (oldSvg) oldSvg.remove();
      }
      if (this._svgEl && this._svgEl.parentNode) this._svgEl.remove();
      this._el = null;
      this._svgEl = null;
    },
  };

  // ─────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────

  function _rgba(color, alpha) {
    const a = clamp(alpha, 0, 1);
    if (color && color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1,3), 16);
      const g = parseInt(color.slice(3,5), 16);
      const b = parseInt(color.slice(5,7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (color && color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
    }
    if (color && color.startsWith('rgba(')) {
      return color.replace(/,[\d.]+\)$/, `,${a})`);
    }
    return `rgba(128,128,128,${a})`;
  }

  function _fmtTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────
  return {
    PerformanceMonitor,
    PaletteExtractor,
    AudioReactive,
    ThemeSync,
    HomeParticles,
    ExpandAtmosphere,
    MusicVisualizer,
    ExpandPlayer,
    RandomSongAnim,

    init() {
      if (_s.initialized) return;
      _s.initialized = true;
      console.log('[Atmosphere] Engine v2 initializing…');

      ThemeSync.refresh();
      PerformanceMonitor.start();
      HomeParticles.init();

      const particlesOn = (typeof state !== 'undefined') ? state.particlesOn : true;
      if (particlesOn) HomeParticles.start();

      const [acc, acc2] = ThemeSync.getPalette();
      HomeParticles.updateColors([acc, acc2]);

      console.log('[Atmosphere] Engine v2 ready ✓');
    },

    onSongChange(song) {
      if (!song) return;
      console.log('[Atmosphere] Song change:', song.title);
      const imgUrl = song.image || '';
      PaletteExtractor.extract(imgUrl, palette => {
        _s.palette = palette;
        HomeParticles.updateColors(palette);
        ExpandPlayer.onSongChange(song);
      });
      if (typeof state !== 'undefined' && state.analyser && !AudioReactive._analyser) {
        AudioReactive.init(state.analyser);
      }
    },

    onPlayStateChange(isPlaying) {
      if (isPlaying) AudioReactive.start();
      ExpandPlayer._syncPlayBtn?.();
    },

    onThemeChange() {
      ThemeSync.refresh();
      const [acc, acc2] = ThemeSync.getPalette();
      HomeParticles.updateColors([acc, acc2]);
      ExpandAtmosphere.updateColors([acc, acc2]);
      console.log('[Atmosphere] Theme synced:', acc);
    },

    toggleParticles(enabled) {
      HomeParticles.toggle(enabled);
    },

    openExpand(song) { ExpandPlayer.open(song); },
    closeExpand()    { ExpandPlayer.close(); },
    isExpandOpen()   { return ExpandPlayer.isOpen(); },

    /** Attach orbital orb animation to a random-selected song item */
    attachRandomAnim(el) { RandomSongAnim.attach(el); },
    /** Remove orbital animation */
    detachRandomAnim()   { RandomSongAnim.detach(); },
  };
})();

// Auto-init (deferred slightly so script.js init() runs first)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AtmosphereEngine.init(), 150);
  });
} else {
  setTimeout(() => AtmosphereEngine.init(), 150);
}
