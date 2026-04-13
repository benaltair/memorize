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
  if (params.has('t')) return decompress(decodeBase64Url(params.get('t')), 'deflate-raw');
  if (params.has('b')) return decompress(decodeBase64Url(params.get('b')), 'br');
  if (params.has('c')) return decompress(decodeBase64Url(params.get('c')), 'deflate-raw');
  if (params.has('q')) return decodeURIComponent(params.get('q'));
  return null;
}

function hasQuoteParam(params) {
  return params.has('t') || params.has('b') || params.has('c') || params.has('q');
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMeta(text, canonicalUrl) {
  const snippet = text.length > 200 ? text.slice(0, 200) + '\u2026' : text;
  const titleSnippet = text.length > 60 ? text.slice(0, 60) + '\u2026' : text;
  const title = `Memorize: \u201c${titleSnippet}\u201d`;
  const description = `\u201c${snippet}\u201d \u2014 Memorize this passage word by word.`;
  return { title, description };
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
  } catch (e) {
    return next();
  }
  if (!text) return next();

  const canonicalUrl = `${SITE}${url.pathname}${url.search}`;
  const { title, description } = buildMeta(text, canonicalUrl);

  const res = await next();
  const html = await res.text();

  const patched = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${esc(canonicalUrl)}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(description)}"`);

  return new Response(patched, {
    status: res.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
