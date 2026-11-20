'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { withReduced } from '@/lib/motion';
import { OVERLAY_EASE } from './shared/chrome';

import Launcher from './Launcher';
import SnakeGame from './snake/SnakeGame';
import TetrisGame from './tetris/TetrisGame';
import TypeRacerGame from './typeracer/TypeRacerGame';
import PlatformerGame from './platformer/PlatformerGame';
import StackerGame from './stacker/StackerGame';
import MergeGame from './merge/MergeGame';
import BoardsScreen from './BoardsScreen';
import type { GameId } from './registry';

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
        {game === 'platformer' && <motion.div key="platformer" className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><PlatformerGame onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'stacker'    && <motion.div key="stacker"    className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><StackerGame    onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'merge'      && <motion.div key="merge"      className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><MergeGame      onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'snake'     && <motion.div key="snake"     className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><SnakeGame onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'tetris'    && <motion.div key="tetris"    className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><TetrisGame     onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'typeracer' && <motion.div key="typeracer" className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><TypeRacerGame  onBack={back} isMobile={isMobile} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
