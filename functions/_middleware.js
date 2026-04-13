const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Googlebot|Bingbot|Baiduspider|DuckDuckBot|Pinterestbot|Slackbot|vkShare|Embedly|redditbot|Applebot|iMessageLinkPrefetch/i;

async function decodeBrotli(b64) {
  const raw = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ds = new DecompressionStream('br');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(ds.readable).text();
}

async function decodeDeflateRaw(b64) {
  const raw = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(ds.readable).text();
}

function extractQuote(url) {
  const params = new URL(url).searchParams;

  if (params.has('b')) {
    return decodeBrotli(params.get('b'));
  }
  if (params.has('c')) {
    return decodeDeflateRaw(params.get('c'));
  }
  if (params.has('q')) {
    return Promise.resolve(decodeURIComponent(params.get('q')));
  }
  return Promise.resolve(null);
}

function buildMeta(text) {
  const snippet = text.length > 200 ? text.slice(0, 200) + '...' : text;
  const titleText = text.length > 60 ? text.slice(0, 60) + '...' : text;
  return {
    title: `Memorize: \u201c${titleText}\u201d`,
    description: `\u201c${snippet}\u201d \u2014 Memorize this passage word by word.`,
  };
}

class MetaRewriter {
  constructor(value) {
    this.value = value;
  }
  element(el) {
    el.setAttribute('content', this.value);
  }
}

class TitleRewriter {
  constructor(text) { this.text = text; }
  element(el) { el.setInnerContent(this.text); }
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';

  if (!BOT_UA.test(ua) || (!url.searchParams.has('b') && !url.searchParams.has('q') && !url.searchParams.has('c'))) {
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
  const res = await next();

  return new HTMLRewriter()
    .on('title', new TitleRewriter(title))
    .on('meta[name="description"]', new MetaRewriter(description))
    .on('meta[property="og:title"]', new MetaRewriter(title))
    .on('meta[property="og:description"]', new MetaRewriter(description))
    .on('meta[property="og:url"]', new MetaRewriter(request.url))
    .on('meta[name="twitter:title"]', new MetaRewriter(title))
    .on('meta[name="twitter:description"]', new MetaRewriter(description))
    .transform(res);
}
