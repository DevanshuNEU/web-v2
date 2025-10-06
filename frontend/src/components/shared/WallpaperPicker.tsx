'use client';

import Image from 'next/image';
import { useTheme } from '@/store/themeStore';
import { wallpapers, getWallpapersForTheme } from '@/data/wallpapers';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

export function WallpaperPicker() {
  const { mode, wallpaper, setWallpaper } = useTheme();
  const availableWallpapers = getWallpapersForTheme(mode);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Wallpaper</h3>
      <div className="grid grid-cols-3 gap-3">
        {availableWallpapers.map((wp) => (
          <button
            key={wp.id}
            onClick={() => {
              setWallpaper(wp);
              toast.success(`Wallpaper changed to ${wp.name}`);
            }}
            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                      ${wallpaper?.id === wp.id 
                        ? 'border-accent ring-2 ring-accent/30' 
                        : 'border-border hover:border-accent/50'
                      }`}
          >
            <Image
              src={wp.imageUrl!}
              alt={wp.name}
              fill
              className="object-cover"
            />
            {wallpaper?.id === wp.id && (
              <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Check size={20} className="text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-secondary">
        {wallpaper?.name || 'No wallpaper selected'}
      </p>
    </div>
  );
}
