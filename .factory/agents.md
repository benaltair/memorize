# Memorize - Agent Notes

## Project Overview
Single-file memorization web app. Users enter a quote/passage, then hide words one-by-one until they can recite from memory. Hosted on **Cloudflare Pages**.

## Architecture
- **`index.html`** -- Entire app: HTML + CSS + JS in one file. No build step, no framework, no dependencies beyond a CDN-loaded `brotli-wasm` for URL compression.
- **`functions/_middleware.js`** -- Cloudflare Pages Function (edge middleware). Rewrites meta tags server-side for link preview crawlers.
- **`wrangler.toml`** -- Cloudflare Pages config. Sets `compatibility_date = "2025-01-01"` and `nodejs_compat` flag.

## URL Sharing System
Quotes are encoded into URL query parameters using 3 formats (in priority order):
1. `?b=` -- Brotli quality 11 via `brotli-wasm` (smallest URLs, current default)
2. `?c=` -- Deflate-raw via `CompressionStream` (legacy, kept for old shared links)
3. `?q=` -- Plain `encodeURIComponent` (fallback if compression fails)

All use URL-safe base64 (`+`→`-`, `/`→`_`, no padding).

## Server-Side Meta Tags (Link Previews)
`functions/_middleware.js` intercepts requests from bots/crawlers (detected via user-agent regex) and uses Cloudflare's `HTMLRewriter` to inject the quote text into `<title>`, `og:title`, `og:description`, `twitter:title`, `twitter:description`, `description`, and `og:url` meta tags. Regular users bypass the middleware entirely (zero overhead).

## Themes
Three themes: `light`, `sepia`, `dark`. Controlled via `data-theme` attribute on `<html>`.

## Easter Eggs
Alt+click the theme button triggers visual effects (gravity, wavy, letter drop, trippy colors, blur). Effects are shuffled deck-style so they don't repeat until all have been seen.

## Conventions
- No build tools, no npm, no bundler. Everything is vanilla JS/CSS in `index.html`.
- Georgia/serif font family throughout.
- CSS custom properties for theming.
- All JS is wrapped in an IIFE.
- Font sizes are class-based (`size-1` through `size-7`) with responsive breakpoints.
- Auto-sizes text based on passage character count.
