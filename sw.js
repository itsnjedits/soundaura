/**
 * SoundAura Service Worker v3
 *
 * ── HOW UPDATES WORK ─────────────────────────────────────────
 *
 * 1. NORMAL UPDATE FLOW
 *    - You push new code to GitHub/server (index.html, script.js, etc.)
 *    - Browser detects an updated sw.js on next visit or background check
 *    - New SW downloads + installs but WAITS (old SW still controls the page)
 *    - UI shows "New version available — Refresh?" banner (see script.js)
 *    - User clicks Refresh → new SW takes control → page reloads with fresh code
 *
 * 2. WHAT YOU MUST DO WHEN PUSHING UPDATES
 *    - Bump CACHE_NAME version (e.g. soundaura-v3 → soundaura-v4)
 *    - This causes the old cache to be pruned on activate
 *    - Users always get fresh assets after refresh
 *
 * 3. FORCE UPDATE (if users are stuck on old version)
 *    - Change CACHE_NAME to a new string
 *    - Old cache is deleted on activate, forcing fresh fetches
 *
 * ── PUSH NOTIFICATIONS (REFERENCE) ──────────────────────────
 *
 * To implement "New Songs Added" or "App Updated" push notifications:
 *
 * STEP 1 — Generate VAPID keys (one-time setup on your server):
 *   npm install web-push
 *   web-push generate-vapid-keys
 *   → gives you VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
 *
 * STEP 2 — Subscribe the user (in script.js):
 *   const reg = await navigator.serviceWorker.ready;
 *   const sub = await reg.pushManager.subscribe({
 *     userVisibleOnly: true,
 *     applicationServerKey: VAPID_PUBLIC_KEY  // base64url string
 *   });
 *   // Send `sub` to your backend to store
 *
 * STEP 3 — Send push from your server (Node.js example):
 *   const webpush = require('web-push');
 *   webpush.setVapidDetails('mailto:you@email.com', PUB_KEY, PRIV_KEY);
 *   await webpush.sendNotification(storedSubscription, JSON.stringify({
 *     title: 'SoundAura',
 *     body: 'New songs added! 🎵',
 *     icon: '/favicon/icon-192.png'
 *   }));
 *
 * STEP 4 — Handle push in this service worker:
 *   self.addEventListener('push', (event) => {
 *     const data = event.data.json();
 *     event.waitUntil(
 *       self.registration.showNotification(data.title, {
 *         body: data.body,
 *         icon: data.icon,
 *         badge: '/favicon/icon-192.png'
 *       })
 *     );
 *   });
 *   self.addEventListener('notificationclick', (event) => {
 *     event.notification.close();
 *     event.waitUntil(clients.openWindow('/'));
 *   });
 *
 * NOTE: Push requires a backend server (GitHub Pages alone cannot send pushes).
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_NAME   = 'soundaura-v10';  // ← bump this on every deploy
const AUDIO_CACHE  = 'soundaura-audio-v10';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/songs.json',
  '/sw.js',
  '/manifest.json'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching local assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache partial failure (non-fatal):', err);
      });
    })
  );
  // DO NOT call self.skipWaiting() here — we want the update banner to show.
  // skipWaiting is triggered by the user clicking "Refresh" in the banner.
});

// ── ACTIVATE: prune stale caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE)
          .map(k => { console.log('[SW] Removing old cache:', k); return caches.delete(k); })
      )
    )
  );
  self.clients.claim();
});

// ── MESSAGE: handle SKIP_WAITING from the update banner ──────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping wait — activating new version');
    self.skipWaiting();
  }
});

// ── Utility: safe cache-put ───────────────────────────────────
// Always clone BEFORE returning or caching so the body stream
// is not consumed twice. Returns the original for the browser.
function safeCacheAndReturn(cache, request, response) {
  // Only cache successful, non-opaque responses
  if (response && response.ok) {
    // Clone before ANY consumption — this is the fix for the TypeError
    const toCache = response.clone();
    cache.put(request, toCache).catch(err =>
      console.warn('[SW] cache.put failed:', err)
    );
  }
  return response;
}

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET; let non-GET pass through
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Audio (GitHub raw): Network-first, cache fallback ────────
  // Match both /audio/ (lowercase) and /Audio/ (legacy uppercase)
  if (url.hostname === 'raw.githubusercontent.com' &&
      (url.pathname.includes('/audio/') || url.pathname.includes('/Audio/'))) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        try {
          const response = await fetch(event.request);
          return safeCacheAndReturn(cache, event.request, response);
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          // No cache, no network — return a meaningful error response
          return new Response('Audio unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Thumbnails / singer images: Cache-first, network fallback ─
  if (url.pathname.includes('/Thumbnails/') || url.pathname.includes('/choice/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          return safeCacheAndReturn(cache, event.request, response);
        } catch {
          return new Response('Image unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Everything else: Stale-while-revalidate ───────────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      // Kick off a fresh fetch regardless (revalidate in background)
      // IMPORTANT: pass the original response to safeCacheAndReturn — it handles cloning internally.
      // Do NOT pre-clone here; that would create a redundant stream.
      const fetchPromise = fetch(event.request).then(response => {
        return safeCacheAndReturn(cache, event.request, response);
      }).catch(() => null);

      // Return cached immediately if available; otherwise await network
      if (cached) return cached;
      const fresh = await fetchPromise;
      if (fresh) return fresh;
      // Navigation fallback
      if (event.request.mode === 'navigate') {
        return cache.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
