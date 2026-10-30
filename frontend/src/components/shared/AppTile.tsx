'use client';

import React from 'react';
import { appRegistry } from '@/lib/appRegistry';
import { COLOR_TILE, FLAVORS, MONO_TILE } from '@/lib/appTile';
import { useIsMono } from '@/hooks/usePalette';
import type { AppType } from '../../../../shared/types';

interface AppTileProps {
  appType: AppType;
  size: number;
}

/**
 * The face of an app icon (see lib/appTile.ts). In color, a navy tile with a
 * two-tone Phosphor glyph: the duotone back layer takes the flavor's flat
 * color and the outline takes a vertical gradient. The gradient id is unique
 * per tile so the same app can sit in the dock and Launchpad at once.
 * In mono, a graphite tile with a white glyph.
 */
export default function AppTile({ appType, size }: AppTileProps) {
  const mono = useIsMono();
  const reg = appRegistry[appType];
  const Glyph = reg.glyph;
  const flavor = FLAVORS[reg.flavor];
  // useId output contains characters that are awkward inside url(#...).
  const gradientId = `glyph-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const tile = mono ? MONO_TILE : COLOR_TILE;

  return (
    <div
      data-app-tile={appType}
      data-tile-palette={mono ? 'mono' : 'color'}
      className="relative grid flex-shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: tile.background,
        border: tile.border,
        boxShadow: tile.boxShadow,
      }}
    >
      {!mono && (
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={flavor.top} />
              <stop offset="1" stopColor={flavor.bottom} />
            </linearGradient>
          </defs>
        </svg>
      )}
      <Glyph
        aria-hidden
        size={Math.round(size * 0.56)}
        weight="duotone"
        color={mono ? '#fff' : undefined}
        className={mono ? undefined : 'glyph-two-tone'}
        style={
          mono
            ? undefined
            : ({ '--glyph-back': flavor.back, '--glyph-front': `url(#${gradientId})` } as React.CSSProperties)
        }
      />
    </div>
  );
}
