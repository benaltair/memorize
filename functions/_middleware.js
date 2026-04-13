const SITE = 'https://memorizes.org';

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Googlebot|Bingbot|Baiduspider|DuckDuckBot|Pinterestbot|Slackbot|vkShare|Embedly|redditbot|Applebot|iMessageLinkPrefetch/i;

function decodeBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decompress(bytes, format) {
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(ds.readable).text();
}

async function extractQuote(url) {
  const params = new URL(url).searchParams;

  // Current canonical format: deflate-raw
  if (params.has('t')) {
    return decompress(decodeBase64Url(params.get('t')), 'deflate-raw');
  }
  // Legacy: Brotli (from brotli-wasm era)
  if (params.has('b')) {
    return decompress(decodeBase64Url(params.get('b')), 'br');
  }
  // Legacy: deflate-raw with old param name
  if (params.has('c')) {
    return decompress(decodeBase64Url(params.get('c')), 'deflate-raw');
  }
  // Plaintext fallback
  if (params.has('q')) {
    return decodeURIComponent(params.get('q'));
  }
  return null;
}

function hasQuoteParam(params) {
  return params.has('t') || params.has('b') || params.has('c') || params.has('q');
}

function buildMeta(text) {
  const snippet = text.length > 200 ? text.slice(0, 200) + '\u2026' : text;
  const titleSnippet = text.length > 60 ? text.slice(0, 60) + '\u2026' : text;
  return {
    title: `Memorize: \u201c${titleSnippet}\u201d`,
    description: `\u201c${snippet}\u201d \u2014 Memorize this passage word by word.`,
  };
}

class MetaRewriter {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute('content', this.value); }
}

class TitleRewriter {
  constructor(text) { this.text = text; }
  element(el) { el.setInnerContent(this.text); }
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const params = url.searchParams;

  if (!BOT_UA.test(ua) || !hasQuoteParam(params)) {
    return next();
  }

  let text;
  try {
    text = await extractQuote(request.url);
  } catch {
    return next();
  }
  if (!text) return next();

  const { title, description } = buildMeta(text);
  const canonicalUrl = `${SITE}${url.pathname}${url.search}`;
  const res = await next();

  return new HTMLRewriter()
    .on('title', new TitleRewriter(title))
    .on('meta[name="description"]', new MetaRewriter(description))
    .on('meta[property="og:title"]', new MetaRewriter(title))
    .on('meta[property="og:description"]', new MetaRewriter(description))
    .on('meta[property="og:url"]', new MetaRewriter(canonicalUrl))
    .on('meta[name="twitter:title"]', new MetaRewriter(title))
    .on('meta[name="twitter:description"]', new MetaRewriter(description))
    .transform(res);
}
