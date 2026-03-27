'use client';

import Image from 'next/image';
import { useTheme } from '@/store/themeStore';
import { getWallpapersForTheme } from '@/data/wallpapers';
import type { Wallpaper } from '@/store/themeStore';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function WallpaperThumb({ wp, selected }: { wp: Wallpaper; selected: boolean }) {
  const isAnimated = wp.type === 'animated';

  return (
    <button
      onClick={() => { /* handled in parent */ }}
      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                ${selected
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-border hover:border-accent/50'
                }`}
    >
      {/* Preview */}
      {wp.imageUrl ? (
        <Image src={wp.imageUrl} alt={wp.name} fill className="object-cover" />
      ) : wp.thumbnail ? (
        <div className="absolute inset-0" style={{ background: wp.thumbnail }} />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}

      {/* Animated badge */}
      {isAnimated && (
        <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium">
          <Sparkles size={8} />
          LIVE
        </div>
      )}

      {/* Selected overlay */}
      {selected && (
        <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-lg">
            <Check size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
        <p className="text-white text-[10px] font-medium truncate">{wp.name}</p>
      </div>
    </button>
  );
}

export function WallpaperPicker() {
  const { mode, wallpaper, setWallpaper } = useTheme();
  const available = getWallpapersForTheme(mode);

  const staticWps = available.filter(w => w.type === 'static');
  const animatedWps = available.filter(w => w.type === 'animated');

  const pick = (wp: Wallpaper) => {
    setWallpaper(wp);
    toast.success(`Wallpaper: ${wp.name}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text">Wallpaper</h3>

      {animatedWps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-secondary flex items-center gap-1">
            <Sparkles size={11} /> Live Wallpapers
          </p>
          <div className="grid grid-cols-3 gap-2">
            {animatedWps.map(wp => (
              <div key={wp.id} onClick={() => pick(wp)}>
                <WallpaperThumb wp={wp} selected={wallpaper?.id === wp.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-text-secondary">Static</p>
        <div className="grid grid-cols-3 gap-2">
          {staticWps.map(wp => (
            <div key={wp.id} onClick={() => pick(wp)}>
              <WallpaperThumb wp={wp} selected={wallpaper?.id === wp.id} />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Active: <span className="text-text">{wallpaper?.name ?? 'None'}</span>
        {wallpaper?.type === 'animated' && <span className="text-accent ml-1">(live)</span>}
      </p>
    </div>
  );
}
