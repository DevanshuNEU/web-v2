'use client';

import { SoundToggle } from '../../shared/TouchButton';
import { PixelButton } from './pixelUi';

/**
 * The title screen's choices, over the live rooftop scene (the logo is drawn
 * in the canvas). Story continues from the saved progress.
 */
export function TitleMenu({ continueId, hasProgress, onStory, onMap, onEndless, onBoard }: {
  continueId: string; hasProgress: boolean;
  onStory: () => void; onMap: () => void; onEndless: () => void; onBoard: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-3 px-6">
      {/* the logo is drawn in the canvas; this names the screen for screen readers */}
      <h2 className="sr-only">Main Character</h2>
      <PixelButton primary onClick={onStory} className="w-full max-w-[18rem]" label={hasProgress ? `Continue the story, level ${continueId}` : 'Story'}>
        {hasProgress ? `Continue ${continueId}` : 'Story'}
      </PixelButton>
      <div className="flex w-full max-w-[18rem] gap-3">
        {hasProgress && <PixelButton onClick={onMap} className="flex-1">Chapters</PixelButton>}
        <PixelButton onClick={onEndless} className="flex-1">Endless</PixelButton>
      </div>
      <div className="flex items-center gap-2">
        <PixelButton onClick={onBoard} className="!min-h-10 !px-3 !py-1.5 !text-[11px]">Leaderboard</PixelButton>
        <SoundToggle className="font-mono uppercase tracking-wider !text-[#d8f8ff]" />
      </div>
    </div>
  );
}
