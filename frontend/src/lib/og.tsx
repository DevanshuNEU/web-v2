/**
 * Link-preview card renderer shared by every opengraph-image route.
 *
 * 1200x630, black and white like the favicon: a mono kicker with the d-cursor
 * mark, a big title, a subtitle, up to three numbers, and a byline so the
 * name travels with every shared link. Fonts are bundled Geist TTFs (OFL)
 * because next/og cannot read woff2 and fetching at build time is flaky.
 */

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PERSON_NAME, ROLE_LINE } from './site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export interface OgStat {
  metric: string;
  label: string;
}

export interface OgCard {
  /** Mono path after the domain, e.g. "projects". Empty for the home card. */
  kicker?: string;
  title: string;
  subtitle: string;
  stats?: OgStat[];
}

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="15" fill="#0A0A0A" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1.5"/><g fill="#FFFFFF"><path transform="translate(11.06 47.00) scale(0.0499 -0.0499)" d="M260 -12Q192 -12 142.5 22.0Q93 56 66.0 118.5Q39 181 39 267Q39 352 66.5 415.0Q94 478 143.5 512.0Q193 546 260 546Q316 546 358.5 523.0Q401 500 423 458V710H551V0H429L426 79Q404 36 360.0 12.0Q316 -12 260 -12ZM299 92Q358 92 390.5 137.5Q423 183 423 267Q423 352 391.0 397.0Q359 442 299 442Q241 442 206.5 395.5Q172 349 172 267Q172 187 206.5 139.5Q241 92 299 92Z"/><rect x="42.53" y="35" width="9" height="12" rx="1"/></g></svg>`;
const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

const FONT_DIR = join(process.cwd(), 'src/assets/og');

async function loadFonts() {
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(FONT_DIR, 'Geist-Regular.ttf')),
    readFile(join(FONT_DIR, 'Geist-SemiBold.ttf')),
    readFile(join(FONT_DIR, 'GeistMono-Medium.ttf')),
  ]);
  return [
    { name: 'Geist', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: semibold, weight: 600 as const, style: 'normal' as const },
    { name: 'Geist Mono', data: mono, weight: 500 as const, style: 'normal' as const },
  ];
}

export async function renderOgCard({ kicker, title, subtitle, stats = [] }: OgCard): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const shown = stats.slice(0, 3);
  const titleSize = title.length > 18 ? 76 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#0A0A0A',
          color: '#FFFFFF',
          fontFamily: 'Geist',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 22, letterSpacing: 2, color: '#8A8A8A', textTransform: 'uppercase' }}>
            {kicker ? `devanshuchicholikar.com / ${kicker}` : 'devanshuchicholikar.com'}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={MARK_SRC} width={64} height={64} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.02 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: '#A3A3A3', lineHeight: 1.3, maxWidth: 1000 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {shown.length > 0 && (
            <div style={{ display: 'flex', gap: 56 }}>
              {shown.map(s => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 330 }}>
                  <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>{s.metric}</div>
                  <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 18, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', height: 1, background: 'rgba(255,255,255,0.14)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#D4D4D4' }}>
            <div style={{ display: 'flex' }}>{PERSON_NAME}</div>
            <div style={{ display: 'flex', color: '#8A8A8A' }}>{`${ROLE_LINE} · Boston`}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
