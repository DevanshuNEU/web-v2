'use client';

import { lazy, Suspense, useState, useCallback, type ComponentType, type LazyExoticComponent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { withReduced } from '@/lib/motion';
import { OVERLAY_EASE } from './shared/chrome';

import Launcher from './Launcher';
import BoardsScreen from './BoardsScreen';
import type { GameId, PlayableId } from './registry';

// Each game is its own chunk, fetched when the visitor picks it, so opening
// the Arcade downloads the launcher and nothing else.
type GameView = LazyExoticComponent<ComponentType<{ onBack: () => void; isMobile: boolean }>>;
const GAME_VIEWS: Record<PlayableId, GameView> = {
  platformer: lazy(() => import('./platformer/PlatformerGame')),
  snake: lazy(() => import('./snake/SnakeGame')),
  stacker: lazy(() => import('./stacker/StackerGame')),
  tetris: lazy(() => import('./tetris/TetrisGame')),
  typeracer: lazy(() => import('./typeracer/TypeRacerGame')),
};

/** While a game's chunk loads: the empty game surface, nothing that flashes. */
function GameLoading() {
  return (
    <div className="h-full" aria-busy="true">
      <span className="sr-only">Loading the game</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesApp({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [game, setGame] = useState<GameId>('launcher');
  // The game the visitor just left, so Back returns focus to its row.
  const [lastGame, setLastGame] = useState<GameId | null>(null);
  const back = useCallback(() => { setLastGame(game); setGame('launcher'); }, [game]);
  const reduced = useReducedMotion();
  const isMobile = variant === 'mobile';

  // Selector <-> game transition: an occasional surface, so a single ease-out
  // slide (transform + opacity) is allowed; it collapses to instant under
  // reduced motion. Coming from the selector, a game enters from the right;
  // returning, the selector fades.
  const slideIn  = reduced ? { opacity: 0 } : { opacity: 0, x: 20 };
  const slideOut = reduced ? { opacity: 0 } : { opacity: 0, x: -20 };
  const tx = withReduced({ duration: 0.26, ease: OVERLAY_EASE }, reduced);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {game === 'launcher'  && <motion.div key="launcher"  className="h-full"               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tx}><Launcher onSelect={setGame} isMobile={isMobile} lastGame={lastGame} /></motion.div>}
        {game === 'boards'     && <motion.div key="boards"     className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><BoardsScreen   onBack={back} /></motion.div>}
        {game !== 'launcher' && game !== 'boards' && (
          <motion.div key={game} className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}>
            <Suspense fallback={<GameLoading />}>
              <GameScreen id={game} onBack={back} isMobile={isMobile} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameScreen({ id, onBack, isMobile }: { id: PlayableId; onBack: () => void; isMobile: boolean }) {
  const View = GAME_VIEWS[id];
  return <View onBack={onBack} isMobile={isMobile} />;
}
