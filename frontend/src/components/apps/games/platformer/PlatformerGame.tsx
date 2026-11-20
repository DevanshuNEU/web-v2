'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, Pause } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline } from '@/components/editorial';
import { bestScore, isButtonTarget, leftRoot, GameHeader, HudStat, GameOverlay, ControlsHint, GameStatus } from '../shared/chrome';
import { SoundToggle } from '../shared/TouchButton';
import { useCanvas } from '../shared/useCanvas';
import { useGameLoop } from '../shared/useGameLoop';
import { Juice } from '../shared/juice';
import { arcadeTheme } from '../shared/theme';
import { hype, comboTier } from '../shared/slang';
import { sfx } from '../shared/sound';
import { useOrientation } from '../shared/useOrientation';
import { useMobileStore } from '@/store/mobileStore';
import { useRun } from '../leaderboard/useRun';
import { RunResult, BoardSheet } from '../leaderboard/Leaderboard';
import { fetchSecret, isError } from '../leaderboard/api';
import { createWorld, drainEvents, score as worldScore, setSecret, stepWorld, type GameEvent, type Result, type Secret, type World, type WorldOptions } from './sim/world';
import { POWERS, POWER_KINDS, type PowerKind } from './sim/powers';
import { STORY, nextStoryId } from './sim/story';
import { createMusic, type Music } from './audio/music';
import { SECRET_FALLBACK } from './sim/level';
import { drawFrame, noteEvent, rendererFor, viewTile } from './render/frame';
import { POWER_COLOR } from './render/pixel/world1';
import { emptyFrame, readInto, releaseAll } from './input/frame';
import { createKeyboard } from './input/keyboard';
import { keyboardHint } from './input/hints';
import { TouchDeck } from './input/TouchDeck';
import { TouchOverlay } from './input/TouchOverlay';
import { storyText, cardIdAfter, cardIdBefore, memoryCaptionId } from './story/text';
import { loadProgress, saveProgress, recordClear, recordMemory, recordAbility, recordPowerSeen, nextLevelId, type Progress } from './ui/progress';
import { buzzPress, useControls } from './ui/controls';
import { promptSpots, promptText, type PromptMove } from './ui/prompts';
import { TitleMenu } from './ui/TitleMenu';
import { StoryMap } from './ui/StoryMap';
import { PauseSettings } from './ui/PauseSettings';
import { PixelButton } from './ui/pixelUi';

/** Best scores: Story (the fixed levels, board 'platformer') and Endless (board 'endless'). */
const HS_KEY = 'devos-platformer-hs';
const HS_ENDLESS = 'devos-mc-endless-hs';
const TITLE = 'Main Character';
// Pink 700 / 800: white text on them passes 4.5:1.
const ACCENT = { fill: '#be185d', hover: '#9d174d' };

/**
 * title: the logo over a live, slowly panning rooftop. map: the chapters.
 * card: a story card being typed. notice: a power's first pickup (the sim
 * waits). playing, paused, over: as before (over only in Endless).
 */
type Status = 'title' | 'map' | 'card' | 'notice' | 'playing' | 'paused' | 'over';
type Mode = 'story' | 'endless';
interface Hud { score: number; coins: number; lives: number; level: number; time: number; memories: number; memTotal: number; blade: boolean; dash: boolean }

/**
 * How the game is laid out. Desktop: a window with keyboard hints. Portrait
 * phone: the view on top, the control deck under it. Landscape phone: the
 * view full bleed, thumb overlay on top, the shell's chrome hidden.
 */
type Layout = 'desktop' | 'portrait' | 'landscape';

/** Story levels that exist, in play order. */
const BUILT = STORY.filter(e => e.built).map(e => e.id);
const ABILITY_KEYS = ['wallJump', 'dash', 'blade'] as const;
const POWER_LINE: Readonly<Record<PowerKind, string>> = {
  batWings: 'Hold Jump while falling to glide',
  tacoRush: 'Run faster, and coins fly to you',
  priorityBoarding: 'Enemies bounce right off you',
  wickedFast: 'Dash again and again',
  encore: 'Every landing stuns enemies nearby',
};
const TYPE_RATE = 32;

/** A fresh seed per run, so every Endless run is a different level. */
function newSeed(): number {
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
}

/** "World 1, Neon Rooftops. Storm Warning." for the status line. */
function worldLine(w: World): string {
  const mod = w.modifier?.name ? ` ${w.modifier.name}.` : '';
  const id = (w as { levelId?: string | null }).levelId;
  return id ? `Level ${id}, ${w.level.name}.${mod}` : `World ${Math.min(w.levelIndex + 1, 4)}, ${w.level.name}.${mod}`;
}

interface Abil { wallJump?: boolean; dash?: boolean; blade?: boolean }
const abilitiesOf = (w: World): Abil => ((w as { abilities?: Abil }).abilities ?? {});
const memoriesOf = (w: World): { id: string; taken: boolean }[] => {
  const m = (w as { memories?: { id: string; taken: boolean }[] }).memories;
  return Array.isArray(m) ? m : [];
};

function hudOf(w: World): Hud {
  const mem = memoriesOf(w);
  const a = abilitiesOf(w);
  return {
    score: worldScore(w), coins: w.stats.coins, lives: Math.max(0, w.lives), level: w.levelIndex, time: Math.floor(w.levelTime),
    memories: mem.filter(m => m.taken).length, memTotal: mem.length, blade: !!a.blade, dash: !!a.dash,
  };
}

const sameHud = (a: Hud, b: Hud) =>
  a.score === b.score && a.coins === b.coins && a.lives === b.lives && a.level === b.level && a.time === b.time &&
  a.memories === b.memories && a.memTotal === b.memTotal && a.blade === b.blade && a.dash === b.dash;

export default function PlatformerGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  // each mode posts to its own board, with its own start token
  const runStory = useRun('platformer');
  const runEndless = useRun('endless');
  const [status, setStatusState] = useState<Status>('title');
  const [mode, setModeState] = useState<Mode>('story');
  const [hud, setHud] = useState<Hud>(() => ({ score: 0, coins: 0, lives: 3, level: 0, time: 0, memories: 0, memTotal: 0, blade: false, dash: false }));
  const [best, setBest] = useState(() => ({ story: bestScore(HS_KEY), endless: bestScore(HS_ENDLESS) }));
  const [result, setResult] = useState<{ kind: Result; score: number; message: string; mode: Mode } | null>(null);
  // a Story run: the score of the levels played in one sitting, posted at the end of the built story
  const storyRun = useRef({ score: 0 });
  const [showBoard, setShowBoard] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [progress, setProgressState] = useState<Progress>(() => loadProgress());
  const [controls, setControls] = useControls();

  const rootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>('title');
  const modeRef = useRef<Mode>('story');
  const progressRef = useRef<Progress>(progress);
  const worldRef = useRef<World>(createWorld());
  const juiceRef = useRef(new Juice(!!reduced));
  const hudRef = useRef<Hud>(hud);
  // The input seam: each adapter writes its own latch, and every fixed step
  // reads one InputFrame from all of them (see input/frame.ts).
  const keyboard = useRef(createKeyboard());
  const touchInput = useRef(emptyFrame());
  const stepInput = useRef(emptyFrame());
  const sources = useRef([keyboard.current.frame, touchInput.current]);
  const secretRef = useRef<Secret>({ ...SECRET_FALLBACK });
  const overrides = useRef<Record<string, string>>({});
  const tickCount = useRef(0);
  const tileRef = useRef(24);
  const fittedLevel = useRef<World['level'] | null>(null);
  // story card: the lines, letters typed, a caption, and what happens after
  const card = useRef<{ lines: string[]; chars: number; total: number; caption?: string; done: boolean; then: () => void } | null>(null);
  const notice = useRef<{ title: string; line: string; accent: string } | null>(null);
  // a slow beat (memory found, a shrine): sim time runs slow for a moment
  const slowBeat = useRef({ t: 0, k: 0 });
  // prompts: their spots for this level and the moves used this session
  const spots = useRef<{ x: number; y: number; move: PromptMove }[]>([]);
  const used = useRef(new Set<PromptMove>());
  const prompts = useRef<{ x: number; y: number; text: string }[]>([]);
  const { containerRef, canvasRef, size, getCtx, style } = useCanvas();
  // World 1's pixel renderer shows its low-res frame here, scaled up by CSS.
  const pixelRef = useRef<HTMLCanvasElement>(null);
  const orientation = useOrientation(rootRef);
  const layout: Layout = !isMobile ? 'desktop' : orientation;
  const touch = isMobile;

  const setStatus = useCallback((s: Status) => { statusRef.current = s; setStatusState(s); }, []);
  const setMode = useCallback((m: Mode) => { modeRef.current = m; setModeState(m); }, []);
  const setProgress = useCallback((p: Progress) => { progressRef.current = p; saveProgress(p); setProgressState(p); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => { refocus(); }, [refocus]);

  // Immersive landscape on the phone: the shell hides its bar while this is
  // set. Leaving landscape or unmounting the game drops it; the store also
  // drops it if the app closes, so the shell can never be left without Done.
  const setImmersive = useMobileStore((s) => s.setImmersive);
  useEffect(() => {
    if (layout !== 'landscape') return;
    setImmersive(true);
    return () => setImmersive(false);
  }, [layout, setImmersive]);

  useEffect(() => {
    juiceRef.current.reduced = !!reduced;
    worldRef.current.noFreeze = !!reduced;
  }, [reduced]);

  // Personal story lines and the secret, once, when the game opens (empty off a crowned device).
  useEffect(() => {
    let live = true;
    void fetchSecret().then(r => {
      if (!live || isError(r)) return;
      overrides.current = r.story ?? {};
      secretRef.current = { name: r.name ?? SECRET_FALLBACK.name, message: r.message ?? SECRET_FALLBACK.message };
    });
    return () => { live = false; };
  }, []);

  // World music: made once, playing only while she plays.
  const musicRef = useRef<Music | null>(null);
  const music = useCallback(() => (musicRef.current ??= createMusic()), []);
  useEffect(() => () => { musicRef.current?.dispose(); musicRef.current = null; }, []);
  const playMusic = useCallback((w: World) => {
    const m = music();
    if (rendererFor(w.level.theme) === 'pixel') { m.play('rooftops'); m.setIntensity(1); } else m.stop();
  }, [music]);
  const seedRef = useRef(0);

  // View metrics: the tile size follows the level's theme (the pixel
  // renderer rounds tiles to whole device pixels per art pixel).
  const fitView = useCallback((w: World) => {
    const T = viewTile(w.level.theme, size.w, size.h, size.dpr);
    tileRef.current = T;
    w.viewCols = size.w / T;
    w.viewRows = size.h / T;
    fittedLevel.current = w.level;
  }, [size]);
  useEffect(() => { fitView(worldRef.current); }, [fitView]);

  const clearInput = useCallback(() => {
    keyboard.current.reset();
    releaseAll(touchInput.current);
    releaseAll(stepInput.current);
  }, []);

  const buzz = useCallback((ms: number) => buzzPress(controls.haptics, ms), [controls.haptics]);

  // ── Story cards ──
  const showCard = useCallback((id: string, then: () => void, caption?: string) => {
    const text = storyText(id, overrides.current);
    if (!text) { then(); return; }
    const lines = text.split('\n');
    const total = lines.reduce((n, l) => n + l.length, 0);
    card.current = { lines, chars: reduced ? total : 0, total, caption, done: !!reduced, then };
    clearInput();
    sfx('perfect');
    setAnnounce(text.replace(/\n/g, ' ') + (caption ? ` ${caption}` : ''));
    setStatus('card');
  }, [reduced, clearInput, setStatus]);

  /** Tap or key on a card: finish the typing, or move on. */
  const advanceCard = useCallback(() => {
    const c = card.current;
    if (!c) return;
    if (!c.done) { c.chars = c.total; c.done = true; return; }
    card.current = null;
    c.then();
  }, []);

  // ── Starting levels ──
  const begin = useCallback((w: World, m: Mode, id?: string) => {
    // until the sim records the story level, keep the one asked for
    const rec = w as { levelId?: string | null };
    if (m === 'story' && id && !rec.levelId) rec.levelId = id;
    fitView(w);
    worldRef.current = w;
    juiceRef.current.clear();
    drainEvents(w);
    hudRef.current = hudOf(w);
    setHud(hudRef.current);
    setResult(null);
    setShowBoard(false);
    clearInput();
    setMode(m);
    if (m === 'endless') runEndless.begin();
    // beginner prompts: 1-1 always; other story levels where the level marks them
    const marks = (w.level as unknown as { setPieces?: { kind: string }[] }).setPieces;
    const marked = Array.isArray(marks) && marks.some(p => p.kind === 'prompt');
    spots.current = m === 'story' && (rec.levelId === '1-1' || marked) ? promptSpots(w.level) : [];
    prompts.current = [];
    setAnnounce(`${worldLine(w)} ${w.level.goal.kind === 'beacon' ? 'Run to the beacon.' : 'Run to the flag.'}`);
    setStatus('playing');
    refocus();
  }, [fitView, clearInput, setMode, runEndless, setStatus, refocus]);

  const startEndless = useCallback((levelIndex = 0) => {
    seedRef.current = newSeed();
    begin(createWorld({ mode: 'endless', levelIndex, secret: secretRef.current, seed: seedRef.current, noFreeze: !!reduced }), 'endless');
  }, [begin, reduced]);

  const startLevel = useCallback((id: string) => {
    const p = progressRef.current;
    const opts = {
      mode: 'story', levelId: id, secret: secretRef.current, seed: 1, noFreeze: !!reduced,
      abilities: p.abilities, memoriesTaken: p.memories,
    } as WorldOptions;
    begin(createWorld(opts), 'story', id);
  }, [begin, reduced]);

  /** Play a story level, with its chapter card first when it opens a chapter. */
  const playStory = useCallback((id: string) => {
    const pre = cardIdBefore(id);
    if (pre) showCard(pre, () => startLevel(id));
    else startLevel(id);
  }, [showCard, startLevel]);

  /** A fresh Story run from the title or the map: its score starts at 0 and gets a start token. */
  const freshStory = useCallback((id: string) => {
    storyRun.current.score = 0;
    runStory.begin();
    playStory(id);
  }, [playStory, runStory]);

  const continueStory = useCallback(() => freshStory(nextLevelId(progressRef.current, BUILT)), [freshStory]);

  const toTitle = useCallback(() => {
    const w = createWorld();
    w.hidden = true;
    fitView(w);
    worldRef.current = w;
    juiceRef.current.clear();
    clearInput();
    setStatus('title');
  }, [fitView, clearInput, setStatus]);

  // ── Events from the rules: sound, haptics, juice and the renderer ──
  const onEvent = useCallback((e: GameEvent, w: World) => {
    const j = juiceRef.current;
    const T = tileRef.current;
    const th = arcadeTheme(mono);
    const x = e.x * T, y = e.y * T;
    const type = e.type as string;
    // the blade (matched by name until its events land in the sim)
    if (type === 'swing') { sfx('slice'); noteEvent('swing', e.x, e.y, e.n); return; }
    if (type === 'hit') { sfx('stomp'); buzz(14); noteEvent('hit', e.x, e.y, e.n); j.burst(x, y, '#fff6c8', 6, 120, 2); return; }
    if (type === 'pogo') { sfx('jump'); buzz(10); noteEvent('pogo', e.x, e.y); used.current.add('attack'); return; }
    if (type === 'decoyDive') { sfx('bump'); noteEvent('decoyDive', e.x, e.y); return; }
    switch (e.type) {
      case 'jump': sfx('jump'); j.burst(x, y, '#fff4e0', 5, 70, 3); break;
      case 'doubleJump':
        sfx('jump'); j.burst(x, y, '#d8ecff', 6, 80, 3);
        noteEvent('doubleJump', e.x, e.y);
        used.current.add('double');
        break;
      case 'land': if (e.n > 10) j.burst(x, y, '#fff4e0', 6, 70, 3); break;
      case 'skid': j.burst(x, y, '#fff4e0', 5, 60, 3); break;
      case 'coin':
        sfx('coin');
        j.burst(x, y, th.sun, 5, 90, 3);
        j.float(x, y - T * 0.4, `+${10 * (w.coinMul || 1)}`, th.sun, Math.max(13, T * 0.6), 0.6);
        if (w.power?.kind === 'tacoRush') noteEvent('coinPull', e.x, e.y);
        break;
      case 'stomp':
        sfx('stomp'); buzz(12);
        j.burst(x, y, th.pink, 14, 200, 4);
        j.float(x, y - T * 0.3, '+50', th.lime, Math.max(15, T * 0.7));
        if (e.n >= 2) j.float(x, y - T * 1.3, hype(comboTier(e.n)), th.sun, Math.max(17, T * 0.85), 1.1);
        break;
      case 'bump': sfx('bump'); break;
      case 'break':
        sfx('bump'); sfx('slice'); buzz(12);
        noteEvent('break', e.x, e.y, e.n);
        j.float(x, y - T * 0.5, '+20', th.text, Math.max(13, T * 0.6), 0.6);
        break;
      case 'powerOn': {
        const kind = POWER_KINDS[e.n];
        if (!kind) break;
        sfx('power'); buzz(20);
        j.burst(x, y, POWER_COLOR[kind] ?? th.violet, 18, 220, 4);
        if (!progressRef.current.powersSeen.includes(kind)) {
          setProgress(recordPowerSeen(progressRef.current, kind));
          notice.current = { title: POWERS[kind].name, line: POWER_LINE[kind], accent: POWER_COLOR[kind] ?? '#9d62ff' };
          clearInput();
          setAnnounce(`${POWERS[kind].name}. ${POWER_LINE[kind]}.`);
          setStatus('notice');
        } else {
          j.float(w.hero.x * T, w.hero.y * T - T * 0.5, POWERS[kind].name.toUpperCase(), th.violet, Math.max(15, T * 0.7), 1);
        }
        break;
      }
      case 'powerOff': j.float(w.hero.x * T, w.hero.y * T - T * 0.5, 'power faded', th.textDim, Math.max(13, T * 0.6), 0.9); break;
      case 'dash': sfx('slide'); buzz(8); j.burst(x, y, th.pink, 6, 120, 3); used.current.add('dash'); break;
      case 'wallJump': sfx('jump'); j.burst(x, y, '#fff4e0', 6, 90, 3); used.current.add('climb'); break;
      case 'sigma':
        sfx('perfect'); buzz(25);
        j.burst(x, y, th.sun, 20, 240, 4);
        j.float(x, y - T * 0.5, `+${e.n} SIGMA`, th.sun, Math.max(20, T), 1.4);
        break;
      case 'shot': sfx('tap'); break;
      case 'memory': {
        const m = memoriesOf(w)[e.n];
        sfx('perfect'); buzz(18);
        noteEvent('memory', e.x, e.y);
        slowBeat.current = { t: 0.4, k: 0.6 };
        if (m) setProgress(recordMemory(progressRef.current, m.id));
        break;
      }
      case 'unlock': {
        const key = ABILITY_KEYS[e.n];
        sfx('boom'); buzz(40);
        noteEvent('unlock', e.x, e.y, e.n);
        slowBeat.current = { t: 1.4, k: 0.7 };
        if (key) {
          setProgress(recordAbility(progressRef.current, key));
          const move: PromptMove = key === 'blade' ? 'attack' : key === 'dash' ? 'dash' : 'climb';
          used.current.delete(move);
          spots.current = [...spots.current, { x: e.x + 3 * (w.level.goalDir ?? 1), y: e.y, move }];
        }
        break;
      }
      case 'hurt': sfx('hurt'); buzz(30); j.shake(7); break;
      case 'die':
        sfx('hurt'); buzz(40); j.shake(9, 0.25);
        j.float(x, y - T, hype('fail'), th.danger, Math.max(19, T * 0.95), 1.3);
        break;
      case 'checkpoint':
        sfx('perfect');
        j.float(x, y - T * 0.8, 'checkpoint', th.lime, Math.max(14, T * 0.65), 1.2);
        break;
      case 'flag':
        sfx('combo', 10);
        j.burst(x, y, th.sun, 16, 200, 4);
        j.float(x, y - T * 0.6, `+${e.n}`, th.sun, Math.max(19, T * 0.95), 1.4);
        break;
      case 'secret':
        sfx('boom');
        j.float(x, y + T * 1.6, 'SECRET UNLOCKED', th.pink, Math.max(18, T * 0.85), 2);
        void fetchSecret().then(r => { setSecret(w, isError(r) ? null : r); secretRef.current = w.secret; });
        break;
      case 'tick': if (++tickCount.current % 3 === 0) sfx('tap'); break;
      case 'clear': sfx('win'); break;
      case 'level':
        if (e.n > 0) { setAnnounce(worldLine(w)); playMusic(w); }
        j.clear();
        break;
      case 'over': sfx('over'); musicRef.current?.stop(); break;
      case 'win': sfx('win'); musicRef.current?.stop(); break;
    }
  }, [mono, playMusic, buzz, setProgress, clearInput, setStatus]);

  // ── The end of a run ──
  const finish = useCallback(() => {
    const w = worldRef.current;
    const levelId = (w as { levelId?: string | null }).levelId;
    if (modeRef.current === 'story' && levelId && w.result !== 'lost') {
      const found = memoriesOf(w).filter(m => m.taken).map(m => m.id);
      const fresh = found.filter(id => !(progressRef.current.levels[levelId]?.memories ?? []).includes(id));
      setProgress(recordClear(progressRef.current, levelId, w.levelTime, found));
      storyRun.current.score += worldScore(w);
      const caption = fresh.length ? storyText(memoryCaptionId(fresh[0]), overrides.current) : undefined;
      const next = (w as { next?: string | null }).next ?? nextStoryId(levelId);
      clearInput();
      showCard(cardIdAfter(levelId), () => {
        if (next && BUILT.includes(next)) { playStory(next); return; }
        // the end of the story so far: the run's score goes to the Story board
        const total = storyRun.current.score;
        setResult({ kind: 'won', score: total, message: w.secret.message, mode: 'story' });
        setBest(b => {
          const nb = { ...b, story: Math.max(b.story, total) };
          try { localStorage.setItem(HS_KEY, String(nb.story)); } catch { /* private mode */ }
          return nb;
        });
        setAnnounce(`The story so far, ${total} points.`);
        setStatus('over');
      }, caption);
      return;
    }
    const final = worldScore(w);
    const kind = w.result ?? 'lost';
    setResult({ kind, score: final, message: w.secret.message, mode: 'endless' });
    setBest(b => {
      const nb = { ...b, endless: Math.max(b.endless, final) };
      try { localStorage.setItem(HS_ENDLESS, String(nb.endless)); } catch { /* private mode */ }
      return nb;
    });
    setAnnounce(kind === 'lost' ? `Out of lives. ${final} points.` : `You finished. ${final} points.`);
    clearInput();
    setStatus('over');
  }, [clearInput, setStatus, setProgress, showCard, playStory]);

  // ── The loop ──
  const update = useCallback((dt: number) => {
    const w = worldRef.current;
    if (w.level !== fittedLevel.current) fitView(w);
    const s = statusRef.current;
    if (s === 'playing') {
      const b = slowBeat.current;
      if (b.t > 0) { b.t -= dt; w.slowMo = b.t > 0 ? b.k : 0; }
      stepWorld(w, readInto(stepInput.current, sources.current), dt);
      if (w.events.length) for (const e of drainEvents(w)) onEvent(e, w);
      // the beginner prompts that still apply, near where she is
      if (spots.current.length) {
        const hx = w.hero.x;
        for (const sp of spots.current) if (sp.move === 'hold' && hx > sp.x + 3) used.current.add('hold');
        prompts.current = spots.current.filter(sp => !used.current.has(sp.move)).map(sp => ({ x: sp.x, y: sp.y, text: promptText(sp.move, touch) }));
      }
    } else {
      // title, map and cards: the night carries on behind them, the camera drifting
      w.t += dt;
      w.cam.px = w.cam.x; w.cam.py = w.cam.y;
      if (s === 'title' || s === 'map') {
        const maxX = Math.max(1, w.level.cols - w.viewCols);
        w.cam.x = (Math.sin(w.t * 0.035) * 0.5 + 0.5) * maxX;
        // hold the roofs at the bottom of the view, the sky above
        w.cam.y = w.cam.py = w.level.rows - w.viewRows;
        w.hidden = true;
      }
      const c = card.current;
      if (s === 'card' && c && !c.done) {
        c.chars = Math.min(c.total, c.chars + dt * TYPE_RATE);
        if (c.chars >= c.total) c.done = true;
      }
    }
    juiceRef.current.update(dt);
  }, [onEvent, fitView, touch]);

  const render = useCallback((alpha: number) => {
    const ctx = getCtx();
    const w = worldRef.current;
    const s = statusRef.current;
    const pixel = rendererFor(w.level.theme) === 'pixel' ? pixelRef.current : null;
    const c = card.current;
    if (ctx) {
      drawFrame(ctx, w, {
        w: size.w, h: size.h, dpr: size.dpr, mono, reduced: !!reduced, alpha, pixel,
        title: s === 'title',
        story: s === 'card' && c ? { lines: c.lines, chars: c.chars, caption: c.caption, done: c.done } : null,
        notice: s === 'notice' ? notice.current : null,
        prompts: s === 'playing' ? prompts.current : undefined,
      }, juiceRef.current);
    }
    const next = hudOf(w);
    if (!sameHud(next, hudRef.current)) { hudRef.current = next; setHud(next); }
    if (w.phase === 'done' && s === 'playing') finish();
  }, [getCtx, size, mono, reduced, finish]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    clearInput();
    setStatus('paused');
    setAnnounce('Paused.');
  }, [clearInput, setStatus]);

  const looping = status === 'playing' || status === 'title' || status === 'map' || status === 'card';
  useGameLoop({ running: looping, update, render, onHidden: pause });

  // Music plays only while playing: paused, cards, title and over are quiet.
  useEffect(() => {
    if (status === 'playing') playMusic(worldRef.current);
    else musicRef.current?.stop();
  }, [status, playMusic]);

  // Draw a still frame whenever the loop is not running (paused, over, a notice, resize).
  useEffect(() => { if (!looping) render(1); }, [looping, render]);
  useEffect(() => { worldRef.current.hidden = true; }, []);

  const resume = useCallback(() => {
    const s = statusRef.current;
    if (s !== 'paused' && s !== 'notice') return;
    notice.current = null;
    clearInput();
    setStatus('playing');
    setAnnounce('Playing.');
    refocus();
  }, [setStatus, refocus, clearInput]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') pause();
    else if (statusRef.current === 'paused') resume();
  }, [pause, resume]);

  // Dev only: jump to any screen for screenshots and scripted play.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return;
    const g = window as unknown as { __baguettino?: unknown };
    g.__baguettino = {
      world: () => worldRef.current, start: (i: number) => startEndless(i), story: (id: string) => startLevel(id),
      card: (id: string) => showCard(id, () => setStatus('map')), map: () => setStatus('map'), title: toTitle, layout,
    };
    return () => { delete g.__baguettino; };
  }, [startEndless, startLevel, showCard, setStatus, toTitle, layout]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const s = statusRef.current;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (s === 'playing' || s === 'paused') { e.preventDefault(); togglePause(); }
      return;
    }
    if (s === 'playing') {
      if (keyboard.current.down(e.key, e.repeat)) e.preventDefault();
      return;
    }
    if (isButtonTarget(e)) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (s === 'card') advanceCard();
      else if (s === 'notice' || s === 'paused') resume();
      else if (s === 'title') continueStory();
      else if (s === 'over') startEndless();
    }
  }, [togglePause, advanceCard, resume, continueStory, startEndless]);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => { keyboard.current.up(e.key); }, []);
  const onBlur = useCallback((e: React.FocusEvent) => { if (leftRoot(e)) pause(); }, [pause]);

  const w = worldRef.current;
  const story = mode === 'story';
  const owned = useMemo(() => ({ attack: hud.blade, dash: hud.dash }), [hud.blade, hud.dash]);
  const lvlName = w.level.name;
  const lvlId = (w as { levelId?: string | null }).levelId;

  const pauseButton = status === 'playing' && (
    <button
      type="button"
      onClick={pause}
      onPointerDown={(e) => e.preventDefault()}
      aria-label="Pause"
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-border text-text-secondary transition-[color,transform] duration-100 ease-out hover:text-text active:scale-95"
    >
      <Pause size={18} aria-hidden />
    </button>
  );

  const stats = (
    <>
      <HudStat label={story ? 'Level' : 'World'} value={story ? (lvlId ?? '1-1') : `${Math.min(hud.level + 1, 4)}`} />
      <HudStat label="Coins" value={hud.coins} />
      {story
        ? <HudStat label="Memories" value={`${hud.memories}/${hud.memTotal || 3}`} />
        : <HudStat label="Lives" value={hud.lives} />}
      <HudStat label="Time" value={hud.time} />
    </>
  );

  // First run in portrait: the control labels sit above the buttons, which is
  // where the numbers are, so the numbers step aside (keeping their space)
  // until she has played. Pause sits on the side away from Jump, so Jump's
  // label above it never covers Pause.
  const hideStats = layout === 'portrait' && status === 'playing' && !controls.seenIntro;
  const statsBox = (
    <div data-testid="stat-strip" aria-hidden={hideStats ? true : undefined}
      className={`flex items-center gap-5 ${hideStats ? 'invisible' : ''}`}>
      {stats}
    </div>
  );
  const pauseOnLeft = layout === 'portrait' && !controls.swap;
  const statStrip = (
    <div className="flex flex-shrink-0 items-center gap-5 px-4 py-2">
      {pauseOnLeft ? <>{pauseButton}{statsBox}<div className="flex-1" /></> : <>{statsBox}<div className="flex-1" />{pauseButton}</>}
    </div>
  );

  // Landscape: one thin translucent strip over the view. It carries the
  // game's own way out (the shell's Done is hidden), away from the thumbs.
  const hudStrip = (
    <div className="dark absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-4 bg-[#120b1f]/55 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
      <button
        type="button"
        onClick={status === 'playing' || status === 'title' ? onBack : toTitle}
        aria-label={status === 'playing' || status === 'title' ? 'Back to arcade' : 'Back to the title'}
        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center text-text-secondary transition-[color,transform] duration-150 ease-out hover:text-text active:scale-95"
      >
        <ArrowLeft size={16} aria-hidden />
      </button>
      {(status === 'playing' || status === 'paused') && stats}
      {status === 'playing' && !story && <HudStat label="Score" value={hud.score} />}
      <div className="flex-1" />
      {pauseButton}
    </div>
  );

  const heading = 'font-mono uppercase tracking-[0.25em] text-[#fff4e8] text-[clamp(1.1rem,5cqi,1.6rem)]';

  const overlay = (status === 'paused' || status === 'over') && (
    <GameOverlay reduced={reduced} key={status}>
      {status === 'paused' && (
        <>
          <h2 className={heading}>Paused</h2>
          <PixelButton primary onClick={resume}>Resume</PixelButton>
          <div className="flex items-center gap-2">
            <PixelButton onClick={() => { toTitle(); }} className="!min-h-10 !px-3 !text-[11px]">Title</PixelButton>
            <SoundToggle className="font-mono uppercase tracking-wider" />
          </div>
          <PauseSettings touch={touch} />
        </>
      )}
      {status === 'over' && result && (
        <>
          <h2 className={heading}>{result.kind === 'lost' ? 'Out of lives' : result.mode === 'story' ? 'The story so far' : 'Run complete'}</h2>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[clamp(1.6rem,6cqi,2.25rem)] font-semibold leading-none tabular-nums text-text">{result.score}</span>
            <span className="text-sm text-text-secondary">points{result.score > 0 && result.score >= best[result.mode] ? ', a new best' : ''}</span>
          </div>
          <RunResult
            game={result.mode === 'story' ? 'platformer' : 'endless'}
            score={result.score}
            getToken={result.mode === 'story' ? runStory.token : runEndless.token}
            onPlayAgain={() => (result.mode === 'story' ? setStatus('map') : startEndless())}
            onShowBoard={() => setShowBoard(true)}
            mono={mono}
            accent={ACCENT.fill}
            accentHover={ACCENT.hover}
          />
          <PixelButton onClick={toTitle}>Title</PixelButton>
        </>
      )}
    </GameOverlay>
  );

  // Title, map, cards and notices: the canvas draws them; these are the DOM controls on top.
  const screens = (
    <>
      {status === 'title' && (
        <TitleMenu
          continueId={nextLevelId(progress, BUILT)}
          hasProgress={Object.keys(progress.levels).length > 0}
          onStory={continueStory}
          onMap={() => setStatus('map')}
          onEndless={() => startEndless()}
          onBoard={() => setShowBoard(true)}
        />
      )}
      {status === 'map' && <StoryMap progress={progress} overrides={overrides.current} onPlay={freshStory} onBack={() => setStatus('title')} />}
      {(status === 'card' || status === 'notice') && (
        <button
          type="button"
          onClick={status === 'card' ? advanceCard : resume}
          aria-label={status === 'card' ? 'Continue the story' : 'Continue'}
          className="absolute inset-0 z-10 cursor-pointer [-webkit-tap-highlight-color:transparent] focus-visible:outline-none"
        >
          <span className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#9d8fd6]">
            {touch ? 'Tap to continue' : 'Space to continue'}
          </span>
        </button>
      )}
    </>
  );

  const pixelView = rendererFor(w.level.theme) === 'pixel';
  const canvas = (
    <>
      <canvas
        ref={pixelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ imageRendering: 'pixelated', display: pixelView ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={style}
        role="img"
        aria-label={`${TITLE}, ${status === 'title' ? 'title screen' : lvlId ? `level ${lvlId}` : 'world 1'}, ${lvlName}`}
        className="relative block"
      />
    </>
  );

  const viewClass = {
    // The view takes every pixel above the controls: on a portrait phone
    // that is a tall window with sky above the level.
    portrait: 'relative min-h-[45%] w-full flex-1',
    landscape: 'absolute inset-0',
    desktop: 'relative min-h-0 flex-1',
  }[layout];

  const playingControls = status === 'playing' || status === 'paused';
  const intro = status === 'playing' && !controls.seenIntro;
  const onPlayed = useCallback(() => setControls({ seenIntro: true }), [setControls]);

  // One tree for every layout, so the view's element (which useCanvas
  // measures) survives a rotation instead of remounting.
  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label={TITLE}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
      data-testid="platformer-root"
      data-layout={layout}
      data-status={status}
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none touch-manipulation [-webkit-touch-callout:none] focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      {layout !== 'landscape' && (
        <GameHeader title={TITLE} score={hud.score} best={best[mode]} onBack={status === 'title' ? onBack : toTitle} onReset={status === 'playing' && !story ? () => startEndless() : toTitle} />
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={containerRef} data-testid="platformer-view" className={`${viewClass} overflow-hidden bg-[#1d1430] touch-none`}>
          {canvas}
          {layout !== 'landscape' && screens}
        </div>
        {layout === 'landscape' ? (
          <>
            {playingControls && (
              <TouchOverlay input={touchInput.current} mono={mono} owned={owned} haptics={controls.haptics} swap={controls.swap}
                opacity={controls.opacity} intro={intro} onPlayed={onPlayed} />
            )}
            {screens}
            {hudStrip}
          </>
        ) : (
          <>
            {playingControls && <Hairline />}
            {playingControls && statStrip}
            {layout === 'portrait' && playingControls && (
              <div className="flex flex-shrink-0 flex-col touch-none">
                <TouchDeck input={touchInput.current} mono={mono} owned={owned} haptics={controls.haptics} swap={controls.swap}
                  opacity={controls.opacity} intro={intro} onPlayed={onPlayed} />
              </div>
            )}
          </>
        )}
        {overlay}
        {showBoard && <BoardSheet game={mode === 'endless' && status !== 'title' ? 'endless' : 'platformer'} onClose={() => { setShowBoard(false); refocus(); }} />}
      </div>

      {layout === 'desktop' && <ControlsHint>{keyboardHint(owned)}</ControlsHint>}
    </div>
  );
}
