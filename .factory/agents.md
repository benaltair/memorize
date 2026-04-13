# Memorize - Agent Notes

## Project Overview
Single-file memorization web app. Users enter a quote/passage, then hide words one-by-one until they can recite from memory. Hosted on **Cloudflare Pages** at `memorizes.org`.

## Architecture
- **`index.html`** -- Entire app: HTML + CSS + JS in one file. No build step, no framework, no external dependencies at runtime (brotli-wasm loaded on demand only for legacy `?b=` links).
- **`functions/_middleware.js`** -- Cloudflare Pages Function (edge middleware). Rewrites meta tags via string replacement for bot/crawler requests so link previews show the quote text.
- **`wrangler.toml`** -- Cloudflare Pages config. `pages_build_output_dir = "."`, `compatibility_date = "2025-01-01"`, `nodejs_compat` flag.

## URL Sharing System
Single canonical format with legacy backward compatibility:
1. `?t=` -- **Current**: deflate-raw via native `CompressionStream` + base64url. Zero external deps.
2. `?b=` -- **Legacy read-only**: Brotli (old brotli-wasm era). Client lazy-loads brotli-wasm only for these. Server decodes natively via `DecompressionStream('br')`.
3. `?c=` -- **Legacy read-only**: deflate-raw with old param name.
4. `?q=` -- **Fallback**: plain `encodeURIComponent` (when CompressionStream unavailable).

All compressed formats use URL-safe base64 (`+`->`-`, `/`->`_`, no padding).

## Share Dialog
Uses `navigator.share()` with only `title` + `url` (NOT `text`) to avoid duplicate URL display in iMessage/WhatsApp. Falls back to `navigator.clipboard.writeText(url)` with a visual checkmark + toast.

## Server-Side Meta Tags (Link Previews)
`functions/_middleware.js` detects bot user agents and rewrites `<title>`, `og:title`, `og:description`, `og:url`, `twitter:title`, `twitter:description`, and `description` via string replacement on the HTML response. Does NOT use HTMLRewriter (caused 500 errors due to compressed response handling). Regular users bypass the middleware entirely.

## Themes
Three themes: `light`, `sepia`, `dark`. Controlled via `data-theme` attribute on `<html>`. Initial theme is set from `prefers-color-scheme: dark` system preference. Cycles through light -> sepia -> dark on theme button click.

## Easter Eggs
Alt+click the theme button triggers visual effects (gravity, wavy, letter drop, trippy colors, blur). Effects are shuffled deck-style so they don't repeat until all have been seen.

## Conventions
- No build tools, no npm, no bundler. Everything is vanilla JS/CSS in `index.html`.
- Georgia/serif font family throughout.
- CSS custom properties for theming.
- All JS is wrapped in an IIFE.
- Font sizes are class-based (`size-1` through `size-7`) with responsive breakpoints.
- Auto-sizes text based on passage character count.
- Use curly quotes (`\u201c`, `\u201d`) and em dashes (`\u2014`) in user-facing text.
- Cloudflare Pages deploy: no build command needed, no npm dependencies. The `functions/` directory is compiled by Pages automatically.

## Known Constraints
- Cloudflare Pages does not auto-install npm deps without a build command set in the dashboard. All functions must be zero-dependency.
- HTMLRewriter in Pages Functions can fail on compressed responses from the static asset server. Use string replacement instead.
- `DecompressionStream('br')` requires `compatibility_date >= 2024-04-29`.
