'use client';

/**
 * SkillsDashboardApp - the proficiency dashboard in the monochrome editorial
 * register.
 *
 * Redesign contract:
 *   - SIGNATURE (mono): each card's proficiency reads as INK DENSITY, not hue.
 *     A halftone arc field (the `Halftone` primitive fed a luminance function)
 *     inks an annular sweep proportional to level/5: level 1 = a short, sparse
 *     arc of small dots; level 5 = a near-full ring of dense, large dots. The
 *     same level also drives stroke weight + opacity on the guide ring so the
 *     value survives even where the dot field is faint.
 *   - SIGNATURE (color / Fun): Halftone renders nothing in the color palette by
 *     contract, so the color path keeps a graceful solid arc-ring fallback whose
 *     stroke weight + opacity still scale with level (legible without relying on
 *     the category hue either).
 *   - DATA-VIZ: category is a MetaLabel + a single graphite dot, never a colored
 *     tint. Level reads from the arc + a weighted dot meter (filled dots grow in
 *     size/opacity with level). Footer stats are width + opacity bars, no color.
 *   - REGISTER: serif card heads (.font-display), mono metadata, hairline
 *     dividers, generous spacing, no nested cards (one hairline-bounded tile).
 *
 * Motion (Emil): cards reveal ONCE on mount via the shared staggered container
 * (never on scroll - a windowed inner scroll container makes in-view triggers
 * unreliable). The dependency-chain hover is the one signature interaction: it
 * communicates STATE (active / related / dim) with opacity + weight only, on a
 * strong ease-out, transform/opacity only, under 200ms, no infinite pulses, no
 * hue. Cards get a restrained :active scale(0.98). The arc draws once per mount
 * (occasional, so it earns an entrance); hover never re-animates the arc.
 *
 * Persona / house rules: strictly three-tone, color branched only via
 * useIsMono(); halftone gated on mono + reduced-motion (handled inside the
 * primitive); no em dashes; no scroll listeners reveal content.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  SKILLS, CAT_LABEL, LEVEL_LABEL, SKILL_CATEGORIES,
  type Skill, type FilterCategory,
} from '@/data/skills';
import { MetaLabel, Hairline } from '@/components/editorial';
import Halftone from '@/components/signature/Halftone';
import { reveal, withReduced, spring } from '@/lib/motion';
import { useIsMono } from '@/hooks/usePalette';

type FilterCat = FilterCategory;
const CATEGORIES = SKILL_CATEGORIES;

/* Strong ease-out (Emil): "starts fast, feels responsive" for state feedback. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ─────────────────────────────────────────────────────────────────── */
/* Proficiency dimensions (read WITHOUT hue)                            */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Level encodes into three reinforcing, hue-free channels so the value reads in
 * either palette and at any zoom:
 *   - sweep:   fraction of the ring that is inked (level/5)
 *   - weight:  guide-ring stroke px (thin at 1, bold at 5)
 *   - density: dot opacity floor in mono / stroke opacity in color
 */
function levelWeight(level: number): number {
  // 1 -> 1.5px, 5 -> 4.5px. Sparse/thin reads "beginner", bold reads "expert".
  return 1.5 + (level - 1) * 0.75;
}
function levelOpacity(level: number): number {
  // 1 -> 0.42, 5 -> 1. The faintest level is still legible against the track.
  return 0.42 + (level - 1) * 0.145;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Arc geometry                                                         */
/* ─────────────────────────────────────────────────────────────────── */

const SIZE = 56;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 21;
const CIRC = 2 * Math.PI * R;

/**
 * Halftone luminance field for a card's proficiency, as a pure (nx, ny) -> lum
 * function in 0..1 normalized canvas space. Dark (low lum) = a large ink dot.
 *
 * The field is an annulus (the ring band) swept from the top (12 o'clock,
 * clockwise) across `level/5` of the circle. Inside the swept band, darkness
 * ramps toward the leading edge a touch so the arc reads as "filling up"; the
 * `levelOpacity` floor keeps even low levels visible. Everything outside the
 * band is white (no dot). The primitive itself is mono-gated, so this only ever
 * runs in the brand register.
 */
function makeArcField(level: number): (nx: number, ny: number) => number {
  const sweep = (level / 5) * Math.PI * 2; // radians of inked arc
  const floor = levelOpacity(level);
  // Band radius in normalized units (canvas is square, 0..1).
  const rNorm = R / SIZE;
  const halfBand = 0.085; // ring thickness / 2 in normalized units
  return (nx, ny) => {
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Outside the ring band -> white (no dot).
    if (Math.abs(dist - rNorm) > halfBand) return 1;
    // Angle from 12 o'clock, clockwise, in 0..2PI.
    let ang = Math.atan2(dx, -dy);
    if (ang < 0) ang += Math.PI * 2;
    if (ang > sweep) return 1; // past the swept portion -> white
    // Within the sweep: darkness tracks the density floor, with a mild ramp so
    // the band feels denser toward its trailing (filled) start.
    const ramp = 1 - (ang / Math.max(sweep, 0.0001)) * 0.25;
    const darkness = floor * ramp;
    return 1 - Math.max(0, Math.min(1, darkness));
  };
}

/**
 * ArcRing - proficiency as ink density (mono) or a weighted solid sweep (color).
 *
 * Mono: a faint full-circle guide track + the Halftone annular sweep. The dot
 * field carries the value; the track only frames it.
 * Color: Halftone returns null, so we draw a solid arc whose stroke weight and
 * opacity scale with level (still readable without the category hue).
 */
function ArcRing({ level, mono, reduced }: { level: number; mono: boolean; reduced: boolean | null }) {
  const field = useMemo(() => makeArcField(level), [level]);
  const weight = levelWeight(level);
  const dash = CIRC * (level / 5);

  // Window-dynamic box: the arc re-proportions with the WINDOW via cqi while the
  // internal geometry stays intact. The SVG scales through its viewBox (stroke,
  // circumference, dash are all viewBox user units), and Halftone samples its
  // luminance field in normalized 0..1 space against a ResizeObserver, so the
  // dot grid refills the resized box cleanly. Max = the original 56px so a
  // maximized window is unchanged; small windows shrink the arc gracefully.
  const box = 'clamp(2.5rem, 9cqi, 3.5rem)';

  return (
    <div className="relative shrink-0" style={{ width: box, height: box }}>
      {/* Faint full-circle guide track (both palettes). */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="rgb(var(--color-border))"
          strokeWidth="1"
        />
        {/* Color path only: solid weighted sweep (mono uses the dot field).
            The arc's final extent is rendered statically via the dash array
            (no animated stroke-dashoffset, which is a non-GPU paint property);
            the value reveals once on mount via opacity only (GPU). Under
            reduced motion the final state shows immediately with no fade. */}
        {!mono && (
          <motion.circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgb(var(--color-text))"
            strokeWidth={weight}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            strokeDashoffset={0}
            initial={reduced ? { opacity: levelOpacity(level) } : { opacity: 0 }}
            animate={{ opacity: levelOpacity(level) }}
            transition={reduced ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }}
            style={{ transformOrigin: `${CX}px ${CY}px`, transform: 'rotate(-90deg)' }}
          />
        )}
      </svg>

      {/* Mono path only: the halftone proficiency field (self-gates to null in
          the color palette and to a single static frame under reduced motion). */}
      {mono && (
        <div className="absolute inset-0">
          <Halftone source={field} cell={4} maxRadius={2} paletteKey={`lvl-${level}`} />
        </div>
      )}

      {/* Center: the level as a quiet serif numeral (legible without hue). */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display text-text leading-none"
          // Tracks the arc box: cqi-based so the numeral re-proportions with the
          // window; max = the original 15px. Lower clamp kept legible.
          style={{ fontSize: 'clamp(0.7rem, 2.4cqi, 0.9375rem)' }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Weighted dot meter - level as size + opacity, never hue              */
/* ─────────────────────────────────────────────────────────────────── */

function DotMeter({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= level;
        // Filled dots grow + gain opacity with position so the meter reads as a
        // weighted ramp, not five identical pips.
        const size = on ? 4 + i * 0.6 : 4;
        const opacity = on ? 0.5 + i * 0.1 : 1;
        return (
          <span
            key={i}
            className={on ? 'bg-text' : 'border border-border'}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              opacity: on ? opacity : 1,
              display: 'inline-block',
            }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Skill card                                                          */
/* ─────────────────────────────────────────────────────────────────── */

type CardMode = 'normal' | 'active' | 'related' | 'dim';

/**
 * Per-mode read, hue-free (Emil: state via opacity + weight, not color):
 *   active  - full ink, head goes to medium serif weight
 *   related - full ink, a quiet "prerequisite / unlocks" hairline note appears
 *   dim     - lowered opacity so the eye ignores it
 *   normal  - baseline
 */
function SkillCard({
  skill, mode, relation, mono, reduced, onHover, onLeave,
}: {
  skill: Skill;
  mode: CardMode;
  relation: 'prerequisite' | 'unlocks' | null;
  mono: boolean;
  reduced: boolean | null;
  onHover: (s: Skill) => void;
  onLeave: () => void;
}) {
  const dim = mode === 'dim';
  const emphasised = mode === 'active' || mode === 'related';

  return (
    <motion.div
      layout
      variants={reveal.item(reduced)}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: EASE_OUT } }}
      // Hover state: opacity + a hairline-weight border shift only. Transform is
      // reserved for the :active press (handled in CSS via whileTap below).
      animate={{
        opacity: dim ? 0.32 : 1,
        transition: { duration: 0.16, ease: EASE_OUT },
      }}
      whileTap={reduced ? undefined : { scale: 0.98, transition: { duration: 0.12, ease: EASE_OUT } }}
      onMouseEnter={() => onHover(skill)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(skill)}
      onBlur={onLeave}
      tabIndex={0}
      data-testid="skill-card"
      data-mode={mode}
      className="group relative flex flex-col gap-3 p-4 text-left select-none cursor-default
                 focus-visible:outline-none"
      style={{
        // No nested cards: a single hairline frame. Active/related thickens the
        // top edge to the ink color; everything else stays at the border token.
        borderTop: `${emphasised ? 2 : 1}px solid ${
          emphasised ? 'rgb(var(--color-text))' : 'rgb(var(--color-border))'
        }`,
      }}
    >
      <div className="flex items-start gap-3.5">
        <ArcRing level={skill.level} mono={mono} reduced={reduced} />

        <div className="min-w-0 flex-1 flex flex-col gap-1.5 pt-0.5">
          <h3
            // Weight is a discrete state read, not an animated one: font-weight
            // is non-GPU (reflow/repaint) and does not interpolate smoothly, so
            // it snaps. State already animates via opacity + the top-edge weight.
            className={`font-display text-text leading-tight truncate ${
              mode === 'active' ? 'font-medium' : ''
            }`}
            // Window-dynamic: re-proportions with the WINDOW width; max = the
            // original 16px so a maximized window matches, small windows shrink.
            style={{ fontSize: 'clamp(0.85rem, 2.6cqi, 1rem)' }}
          >
            {skill.name}
          </h3>
          <div className="flex items-center gap-2 min-w-0">
            {/* Category: a graphite dot + mono label. No tint, no hue. */}
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-text/55 shrink-0" />
            <MetaLabel className="text-text-secondary truncate">
              {CAT_LABEL[skill.category]}
            </MetaLabel>
          </div>
        </div>
      </div>

      {/* Level read-out: weighted dot meter + named tier + experience. */}
      <div className="flex items-center justify-between gap-3">
        <DotMeter level={skill.level} />
        <MetaLabel className="text-text-secondary shrink-0">
          {LEVEL_LABEL[skill.level]} <span aria-hidden className="opacity-40 mx-1">/</span> {skill.xp}
        </MetaLabel>
      </div>

      <p
        className="leading-relaxed text-text-secondary line-clamp-2"
        // Window-dynamic body: scales off the WINDOW; max = the original
        // 12.5px, lower clamp kept legible.
        style={{ fontSize: 'clamp(0.72rem, 1.6cqi, 0.78rem)' }}
      >
        {skill.description}
      </p>

      {/* Dependency-chain note: only on related cards. Communicates the relation
          to the hovered skill in words, hue-free. Fades in on ease-out. */}
      <AnimatePresence>
        {relation && (
          <motion.div
            key={relation}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col gap-2"
          >
            <Hairline />
            <MetaLabel className="text-text">
              {relation === 'prerequisite' ? 'Prerequisite' : 'Unlocks'}
            </MetaLabel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Filter pill - quiet editorial control, mono only                    */
/* ─────────────────────────────────────────────────────────────────── */

function FilterPill({
  label, active, reduced, onClick,
}: {
  label: string;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid="filter-pill"
      // Pressable element -> restrained press scale (Emil). Filtering is
      // occasional, so a brief feedback press is appropriate; no hue, no glow.
      // Gated on reduced motion (the prior CSS active:scale fired regardless).
      whileTap={reduced ? undefined : { scale: 0.97, transition: { duration: 0.12, ease: EASE_OUT } }}
      className="group relative px-3 py-1.5 focus-visible:outline-none"
    >
      <MetaLabel
        className={
          active
            ? 'text-text'
            : 'text-text-secondary transition-colors [@media(hover:hover)and(pointer:fine)]:group-hover:text-text'
        }
      >
        {label}
      </MetaLabel>
      {/* Active marker: a single ink underline that glides between pills. */}
      {active && (
        <motion.span
          layoutId="skills-filter-active"
          aria-hidden
          className="absolute -bottom-px left-3 right-3 h-px bg-text"
          transition={withReduced(spring.window, reduced)}
        />
      )}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export default function SkillsDashboardApp() {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [filter, setFilter]   = useState<FilterCat>('all');
  const [hovered, setHovered] = useState<Skill | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? SKILLS : SKILLS.filter((s) => s.category === filter)),
    [filter],
  );

  // Dependency-chain resolution for the hover signature interaction.
  const resolve = useCallback(
    (skill: Skill): { mode: CardMode; relation: 'prerequisite' | 'unlocks' | null } => {
      if (!hovered) return { mode: 'normal', relation: null };
      if (skill.id === hovered.id) return { mode: 'active', relation: null };
      // skill is a prerequisite OF the hovered skill.
      if (hovered.deps.includes(skill.id)) return { mode: 'related', relation: 'prerequisite' };
      // hovered skill is a prerequisite of skill -> hovered unlocks skill.
      if (skill.deps.includes(hovered.id)) return { mode: 'related', relation: 'unlocks' };
      return { mode: 'dim', relation: null };
    },
    [hovered],
  );

  const onHover = useCallback((s: Skill) => setHovered(s), []);
  const onLeave = useCallback(() => setHovered(null), []);

  // Footer stats: per-category count + average proficiency, as width + opacity
  // bars (no color). Order matches the legacy footer.
  const catStats = useMemo(() => {
    const order: Skill['category'][] = ['ai', 'cloud', 'backend', 'frontend', 'language', 'tool'];
    return order.map((cat) => {
      const skills = SKILLS.filter((s) => s.category === cat);
      const avg = skills.reduce((a, b) => a + b.level, 0) / skills.length;
      return { cat, count: skills.length, avg };
    });
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">

      {/* ── Header ── serif title, mono sub-line, hairline-anchored filter row. */}
      <div className="shrink-0 px-6 pt-6 pb-4 flex flex-col gap-4 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <h1
            className="font-display text-text leading-none"
            // Window-dynamic: scales off the WINDOW width via cqi (the
            // .app-content query container), max = the original 28px so a
            // maximized window is unchanged; small windows scale the serif down.
            style={{ fontSize: 'clamp(1.25rem, 5cqi, 1.75rem)' }}
          >
            Skills
          </h1>
          <MetaLabel className="text-text-secondary">
            {SKILLS.length} skills <span aria-hidden className="opacity-40 mx-1">/</span> 6 domains
            <span aria-hidden className="opacity-40 mx-1">/</span> hover to trace dependencies
          </MetaLabel>
        </div>

        {/* Filter pills. */}
        <div className="flex flex-wrap gap-x-1 gap-y-2 -mx-1">
          {CATEGORIES.map((cat) => (
            <FilterPill
              key={cat}
              label={cat === 'all' ? 'All' : CAT_LABEL[cat as Skill['category']]}
              active={filter === cat}
              reduced={reduced}
              onClick={() => setFilter(cat)}
            />
          ))}
        </div>
      </div>

      {/* ── Card grid ── reveals ONCE on mount via the staggered container. The
          grid is the container; cards are the items. Filter reflow uses layout. */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <motion.div
          layout
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
          className="grid gap-x-5 gap-y-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))' }}
        >
          <AnimatePresence mode="popLayout">
            {visible.map((skill) => {
              const { mode, relation } = resolve(skill);
              return (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  mode={mode}
                  relation={relation}
                  mono={mono}
                  reduced={reduced}
                  onHover={onHover}
                  onLeave={onLeave}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Footer stats ── width + opacity bars, no color. */}
      <div className="shrink-0 px-6 py-3.5 border-t border-border flex flex-wrap gap-x-7 gap-y-3">
        {catStats.map(({ cat, count, avg }) => (
          <div key={cat} className="flex items-center gap-2.5">
            <MetaLabel className="text-text-secondary">
              {count} {CAT_LABEL[cat]}
            </MetaLabel>
            {/* Average-proficiency bar: width = level fraction, opacity = level
                fraction. Reads as "how filled" without any hue. */}
            <span aria-hidden className="relative block h-1 w-14 bg-border/60 rounded-full overflow-hidden">
              {/* Fill is full-width and revealed via a GPU scaleX from the left,
                  not an animated width (width is non-GPU: layout + paint). */}
              <motion.span
                className="absolute inset-y-0 left-0 right-0 rounded-full bg-text"
                style={{ opacity: 0.4 + (avg / 5) * 0.6, transformOrigin: 'left center' }}
                initial={reduced ? { scaleX: avg / 5 } : { scaleX: 0 }}
                animate={{ scaleX: avg / 5 }}
                transition={reduced ? { duration: 0 } : { duration: 0.7, delay: 0.2, ease: EASE_OUT }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
