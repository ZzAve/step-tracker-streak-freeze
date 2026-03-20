## Why

The app currently has no real-user performance monitoring. Vercel Speed Insights provides Core Web Vitals tracking (LCP, FID, CLS, TTFB) out of the box for Vercel-hosted projects, giving visibility into how users actually experience page loads without any external analytics setup.

## What Changes

- Add the Vercel Speed Insights script snippet to all public HTML pages (`index.html`, `keys.html`)
- The snippet consists of a small queue initializer and a deferred script load from `/_vercel/speed-insights/script.js`
- No npm dependencies required — the vanilla/script-tag approach works for non-framework projects

## Capabilities

### New Capabilities
- `speed-insights`: Integration of Vercel Speed Insights script into all HTML pages for Core Web Vitals monitoring

### Modified Capabilities
<!-- None — this is a purely additive observability feature -->

## Impact

- **Files**: `public/index.html`, `public/keys.html` — small script addition before `</body>`
- **Dependencies**: None (script served by Vercel's edge infrastructure at deploy time)
- **APIs**: No backend changes; Vercel handles data collection automatically
- **Performance**: Negligible — script is deferred and lightweight (~1KB)