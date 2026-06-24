// Preloaded via NODE_OPTIONS=--require during `vite build`.
// serialize-javascript@7 (pulled in by Workbox's service-worker minifier,
// which runs in worker threads) uses the Web Crypto global `crypto`. Node < 19
// doesn't expose it in worker threads, so define it everywhere this runs.
if (!globalThis.crypto) {
  globalThis.crypto = require("node:crypto").webcrypto;
}
