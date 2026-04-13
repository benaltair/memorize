# Memorize - Agent Notes

## Project Overview
Single-file memorization web app. Users enter a quote/passage, then hide words one-by-one until they can recite from memory. Hosted on **Cloudflare Pages** at `memorizes.org`.

## Architecture
- **`index.html`** -- Entire app: HTML + CSS + JS in one file. No build step, no framework.
- **`functions/_middleware.js`** -- Cloudflare Pages Function (edge middleware). Rewrites meta tags server-side for link preview crawlers. Also injects `og:image` and `twitter:image` tags pointing to the OG image endpoint.
- **`functions/og.png.js`** -- OG image generation endpoint using `@cloudflare/pages-plugin-vercel-og` (Satori + resvg). Renders quote text on a styled card matching the app's light theme. Loads EB Garamond from Google Fonts.
- **`wrangler.toml`** -- Cloudflare Pages config. Sets `compatibility_date = "2025-01-01"` and `nodejs_compat` flag.
- **`package.json`** -- Only dependency: `@cloudflare/pages-plugin-vercel-og`.

## URL Sharing System
Single canonical format with legacy backward compatibility:
1. `?t=` -- **Current**: deflate-raw via native `CompressionStream` + base64url (no external deps)
2. `?b=` -- **Legacy read-only**: Brotli (from brotli-wasm era). Client loads brotli-wasm on demand only for these old links. Server decodes natively via `DecompressionStream('br')`.
3. `?c=` -- **Legacy read-only**: deflate-raw with old param name
4. `?q=` -- **Fallback**: plain `encodeURIComponent` (used when CompressionStream unavailable)

All compressed formats use URL-safe base64 (`+`->`-`, `/`->`_`, no padding).

## Server-Side Meta Tags (Link Previews)
`functions/_middleware.js` intercepts requests from bots/crawlers (detected via user-agent regex) and uses Cloudflare's `HTMLRewriter` to inject the quote text into `<title>`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `twitter:card` (upgraded to `summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`, and `description` meta tags. Regular users bypass the middleware entirely.

## OG Image Generation
`functions/og.png.js` accepts the same query parameters as the main page. It renders a 1200x630 PNG card with the quote in curly quotes, EB Garamond font, on the app's warm paper background (#f5f0e8). Font sizes adapt to quote length. Response is cached immutably. Uses `@cloudflare/pages-plugin-vercel-og` (wraps Vercel's Satori/resvg for Cloudflare's runtime).

## Themes
Three themes: `light`, `sepia`, `dark`. Controlled via `data-theme` attribute on `<html>`.

## Easter Eggs
Alt+click the theme button triggers visual effects (gravity, wavy, letter drop, trippy colors, blur). Effects are shuffled deck-style so they don't repeat until all have been seen.

## Conventions
- No build tools, no bundler. Everything is vanilla JS/CSS in `index.html`.
- Georgia/serif font family throughout.
- CSS custom properties for theming.
- All JS is wrapped in an IIFE.
- Font sizes are class-based (`size-1` through `size-7`) with responsive breakpoints.
- Auto-sizes text based on passage character count.
- Use curly quotes and em dashes in user-facing text (Unicode `\u201c`, `\u201d`, `\u2014`).
