import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api';

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

async function loadGoogleFont(family, text, weight = 400) {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text: text,
    subset: 'latin',
  });
  const url = `https://fonts.googleapis.com/css2?${params}`;
  const css = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  }).then(r => r.text());

  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error('Font URL not found');
  return fetch(match[1]).then(r => r.arrayBuffer());
}

export async function onRequest(context) {
  const { request } = context;

  let text;
  try {
    text = await extractQuote(request.url);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!text) {
    return new Response('Missing quote parameter', { status: 400 });
  }

  const displayText = text.length > 280 ? text.slice(0, 280) + '\u2026' : text;
  const fontSize = displayText.length > 200 ? 28 : displayText.length > 100 ? 34 : 42;

  const fontText = displayText + 'Memorize';
  const [fontRegular, fontLight] = await Promise.all([
    loadGoogleFont('EB Garamond', fontText, 400),
    loadGoogleFont('EB Garamond', fontText, 500),
  ]);

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          background: '#f5f0e8',
          padding: '60px 80px',
          fontFamily: '"EB Garamond"',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                width: '100%',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: fontSize,
                      lineHeight: 1.6,
                      color: '#3b3530',
                      textAlign: 'center',
                      maxWidth: '1040px',
                      fontWeight: 400,
                    },
                    children: `\u201c${displayText}\u201d`,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderTop: '1px solid #d6cdc0',
                paddingTop: '20px',
                width: '100%',
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 20,
                      letterSpacing: '0.12em',
                      color: '#8a7e72',
                      fontWeight: 500,
                    },
                    children: 'Memorize',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'EB Garamond', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'EB Garamond', data: fontLight, weight: 500, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
