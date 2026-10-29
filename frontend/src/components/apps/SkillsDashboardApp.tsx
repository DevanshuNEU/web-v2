'use client';

/**
 * SkillsDashboardApp - the skills, grouped by area, as plain cards.
 *
 * Each card shows the name, one depth word (Expert / Advanced / Proficient,
 * from the owner's own rating), the one-line evidence, and what the skill is
 * built on ("Builds on Python"). That last line is the "tree", shown on every
 * card so it works for keyboard and touch users too. With a mouse, hovering
 * a card also highlights the skills it builds on and the ones it unlocks.
 *
 * Layout keys off the window (`.dapp` query container): the header scrolls
 * away, the filter bar sticks to the top as one scrollable line in narrow
 * windows and wraps when there is room, and the grid fills as many columns
 * as fit. The "All" view groups cards by area in SKILL_CATEGORIES order (AI
 * first). In the Fun palette each area gets its CAT_COLOR dot.
 */

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  SKILLS, CAT_LABEL, CAT_COLOR, LEVEL_LABEL, SKILL_CATEGORIES,
  type Skill, type SkillCategory, type FilterCategory,
} from '@/data/skills';
import { appLabels } from '@/data/copy';
import { reveal } from '@/lib/motion';
import { useIsMono } from '@/hooks/usePalette';

/* Strong ease-out: starts fast, feels responsive. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const AREAS = SKILL_CATEGORIES.filter((c): c is SkillCategory => c !== 'all');
const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
const COUNT: Record<SkillCategory, number> = Object.fromEntries(
  AREAS.map((a) => [a, SKILLS.filter((s) => s.category === a).length]),
) as Record<SkillCategory, number>;

/** Opacity of cards unrelated to the hovered one. Text stays above 3:1. */
const DIM = 0.6;

type CardMode = 'normal' | 'active' | 'related' | 'dim';
type Relation = 'builds-on' | 'unlocks' | null;

/* ─────────────────────────────────────────────────────────────────── */
/* Skill card                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function SkillCard({
  skill, mode, relation, hoveredName, reduced, onHover, onLeave,
}: {
  skill: Skill;
  mode: CardMode;
  relation: Relation;
  hoveredName: string | null;
  reduced: boolean | null;
  onHover: (s: Skill) => void;
  onLeave: () => void;
}) {
  const emphasised = mode === 'active' || mode === 'related';
  const buildsOn = skill.deps.map((id) => BY_ID.get(id)?.name).filter(Boolean) as string[];

  return (
    <motion.article
      variants={reveal.item(reduced)}
      exit={reduced ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
      animate={{ opacity: mode === 'dim' ? DIM : 1, transition: { duration: 0.16, ease: EASE_OUT } }}
      // Mouse only: a touch "hover" would stick after the tap and dim the grid.
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover(skill); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onLeave(); }}
      data-testid="skill-card"
      data-mode={mode}
      className="flex flex-col gap-2 pt-4"
      style={{
        borderTop: `${emphasised ? 2 : 1}px solid ${
          emphasised ? 'rgb(var(--color-text))' : 'rgb(var(--color-border))'
        }`,
        // Keep the text in place when the rule thickens.
        paddingTop: emphasised ? 'calc(1rem - 1px)' : undefined,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`font-display text-text text-[1.1875rem] leading-tight ${mode === 'active' ? 'font-medium' : ''}`}>
          {skill.name}
        </h3>
        <span className="shrink-0 text-sm text-text-secondary">{LEVEL_LABEL[skill.level]}</span>
      </div>

      <p className="text-[0.9375rem] leading-relaxed text-text-secondary">{skill.description}</p>

      {buildsOn.length > 0 && (
        <p className="text-sm text-text-secondary">
          Builds on <span className="text-text">{buildsOn.join(', ')}</span>
        </p>
      )}

      {/* Hover trace: name the relation on the skills the hovered one builds
          on. Skills it unlocks already say "Builds on <it>" above. */}
      {relation === 'builds-on' && hoveredName && (
        <p className="text-sm font-medium text-text">{hoveredName} builds on this</p>
      )}
    </motion.article>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Filter pill                                                         */
/* ─────────────────────────────────────────────────────────────────── */

function FilterPill({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid="filter-pill"
      className={`skills-pill inline-flex items-center gap-1.5 transition-colors ${
        active
          ? 'bg-text text-bg'
          : 'text-text-secondary [@media(hover:hover)and(pointer:fine)]:hover:text-text [@media(hover:hover)and(pointer:fine)]:hover:bg-text/[0.06]'
      }`}
    >
      {label}
      <span className={active ? 'opacity-80' : 'text-text-secondary'}>{count}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export default function SkillsDashboardApp() {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [hovered, setHovered] = useState<Skill | null>(null);

  const groups = useMemo(
    () =>
      (filter === 'all' ? AREAS : [filter]).map((area) => ({
        area,
        skills: SKILLS.filter((s) => s.category === area),
      })),
    [filter],
  );

  // Hover trace. Nothing dims when the hovered skill has no relations among
  // the visible cards, so a lone skill never greys out the whole grid.
  const visibleIds = useMemo(() => new Set(groups.flatMap((g) => g.skills.map((s) => s.id))), [groups]);
  const hasRelations = useMemo(() => {
    if (!hovered) return false;
    return SKILLS.some(
      (s) => visibleIds.has(s.id) && s.id !== hovered.id && (hovered.deps.includes(s.id) || s.deps.includes(hovered.id)),
    );
  }, [hovered, visibleIds]);

  const resolve = useCallback(
    (skill: Skill): { mode: CardMode; relation: Relation } => {
      if (!hovered || !hasRelations) return { mode: 'normal', relation: null };
      if (skill.id === hovered.id) return { mode: 'active', relation: null };
      if (hovered.deps.includes(skill.id)) return { mode: 'related', relation: 'builds-on' };
      if (skill.deps.includes(hovered.id)) return { mode: 'related', relation: 'unlocks' };
      return { mode: 'dim', relation: null };
    },
    [hovered, hasRelations],
  );

  const onHover = useCallback((s: Skill) => setHovered(s), []);
  const onLeave = useCallback(() => setHovered(null), []);
  const title = appLabels['skills-dashboard']?.title ?? 'Skills';

  return (
    <div className="dapp h-full overflow-auto bg-transparent" data-testid="skills-app">
      <header className="dapp-col !pb-5 flex flex-col gap-2">
        <h1 className="dapp-title">{title}</h1>
        <p className="dapp-lede">
          {SKILLS.length} skills across {AREAS.length} areas, and what each one
          builds on.
        </p>
      </header>

      <div className="skills-bar">
        <nav
          aria-label="Filter skills by area"
          className="skills-pills mx-auto w-full max-w-[72rem] px-[clamp(1rem,4cqi,2.5rem)]"
        >
          <FilterPill
            label="All"
            count={SKILLS.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          {AREAS.map((area) => (
            <FilterPill
              key={area}
              label={CAT_LABEL[area]}
              count={COUNT[area]}
              active={filter === area}
              onClick={() => setFilter(area)}
            />
          ))}
        </nav>
      </div>

      <motion.div
        key={filter}
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="dapp-col !pt-6 flex flex-col gap-10"
      >
        {groups.map(({ area, skills }) => (
          <section key={area} aria-labelledby={`skills-${area}`} className="flex flex-col gap-4">
            {filter === 'all' && (
              <h2 id={`skills-${area}`} className="dapp-h2 flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${mono ? 'bg-text-secondary' : ''}`}
                  style={mono ? undefined : { background: CAT_COLOR[area] }}
                />
                {CAT_LABEL[area]}
                <span className="font-sans text-sm text-text-secondary">{skills.length}</span>
              </h2>
            )}
            {filter !== 'all' && (
              <h2 id={`skills-${area}`} className="sr-only">{CAT_LABEL[area]}</h2>
            )}
            <div className="skills-grid">
              <AnimatePresence initial={false}>
                {skills.map((skill) => {
                  const { mode, relation } = resolve(skill);
                  return (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      mode={mode}
                      relation={relation}
                      hoveredName={hasRelations ? hovered?.name ?? null : null}
                      reduced={reduced}
                      onHover={onHover}
                      onLeave={onLeave}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        ))}
      </motion.div>
    </div>
  );
}
