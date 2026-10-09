'use client';

/**
 * MobileFallback — shown to visitors on screens narrower than 768px.
 *
 * The macOS desktop simulation (draggable windows, dock magnification, hover
 * interactions) does not translate to touch. Rather than showing a broken
 * layout, we render a clean, card-based portfolio summary that covers the
 * essentials: who Devanshu is, what he's built, and how to reach him.
 *
 * Design decisions:
 *   - No Framer Motion dependency — keep this lightweight and fast on mobile.
 *   - Glassmorphism card aesthetic to match the desktop personality.
 *   - Prominent "open on desktop" note — not an error, just a friendly nudge.
 */

import { Github, Linkedin, Mail, ExternalLink, Monitor } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data — kept local so this component has zero data-fetching dependencies and
// works instantly on mobile without waiting for GitHub API calls.
// ---------------------------------------------------------------------------

const LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/DevanshuNEU',
    icon: Github,
    description: 'DevanshuNEU',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/devanshuchicholikar/',
    icon: Linkedin,
    description: 'devanshuchicholikar',
  },
  {
    label: 'Email',
    href: 'mailto:chicholikar.d@northeastern.edu',
    icon: Mail,
    description: 'chicholikar.d@northeastern.edu',
  },
];

const FEATURED_PROJECTS = [
  {
    name: 'OpenCodeIntel',
    tagline: 'Code search for AI coding agents: web app, REST API and a 12-tool MCP server.',
    tech: ['Python', 'MCP', 'RAG'],
    url: 'https://github.com/OpenCodeIntel/opencodeintel',
  },
  {
    name: 'Overhear',
    tagline: 'QA analyst for voice agents: code checks the facts, an LLM-as-a-judge scores the rest.',
    tech: ['TypeScript', 'Next.js', 'Evals'],
    url: 'https://github.com/DevanshuNEU/overhear',
  },
  {
    name: 'CallBudget',
    tagline: 'Finds a hard-to-find drug in fewer calls: 4.3 to 2.3 expected calls.',
    tech: ['Python', 'FastMCP', 'Voice agents'],
    url: 'https://github.com/DevanshuNEU/callbudget',
  },
  {
    name: 'Portfolio OS',
    tagline: 'This portfolio. A desktop OS in a browser tab, built in Next.js.',
    tech: ['Next.js', 'TypeScript', 'Framer Motion'],
    url: 'https://www.devanshuchicholikar.com',
  },
];

const SKILLS = [
  'MCP', 'RAG', 'LLM evals', 'TypeScript', 'React', 'Next.js', 'Python', 'Node.js',
  'AWS', 'GCP', 'Docker', 'Terraform', 'PostgreSQL', 'Go',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MobileFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#0f1923] to-[#1a0f2e] text-white px-5 py-8 overflow-auto">

      {/* ── Header ── */}
      <header className="mb-8">
        {/* devOS brand */}
        <p className="text-xs font-mono text-white/30 mb-4 tracking-widest uppercase">
          dev<span className="text-blue-400">OS</span> v2.1
        </p>

        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Devanshu Chicholikar
        </h1>
        <p className="text-white/60 text-sm mb-1">Software + AI Engineer · Boston, MA</p>
        <p className="text-white/40 text-xs">
          MS Software Engineering · Northeastern University · May 2026
        </p>

        <p className="mt-4 text-sm text-white/70 leading-relaxed max-w-sm">
          I ship AI to production end to end: MCP servers, RAG, evals and voice
          agents, plus the full-stack and infra work around them. Open to Software
          Engineer, AI Engineer and Forward Deployed Engineer roles.
        </p>
      </header>

      {/* ── Links ── */}
      <section className="mb-8">
        <div className="flex flex-col gap-2">
          {LINKS.map(({ label, href, icon: Icon, description }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl
                         bg-white/5 border border-white/10
                         hover:bg-white/10 hover:border-white/20
                         transition-all duration-200 group"
            >
              <Icon size={16} className="text-white/50 group-hover:text-white/80 transition-colors" />
              <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                {label}
              </span>
              <span className="ml-auto text-xs text-white/35 truncate max-w-[160px]">
                {description}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Projects ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          Featured Projects
        </h2>
        <div className="flex flex-col gap-3">
          {FEATURED_PROJECTS.map(({ name, tagline, tech, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 rounded-xl bg-white/5 border border-white/10
                         hover:bg-white/8 hover:border-white/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-white/90">{name}</span>
                <ExternalLink size={12} className="text-white/25 group-hover:text-white/50 transition-colors" />
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-2">{tagline}</p>
              <div className="flex flex-wrap gap-1">
                {tech.map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium
                               bg-blue-500/10 text-blue-400/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Skills ── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          Technical Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(skill => (
            <span
              key={skill}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-white/6 border border-white/10 text-white/65"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* ── Desktop nudge ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
        <Monitor size={16} className="text-blue-400/70 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-white/50 leading-relaxed">
          Visit on a desktop browser for the full{' '}
          <span className="text-white/70 font-medium">devOS experience</span>
          {' '}-- draggable windows, a working terminal, real-time GitHub stats, and more.
        </p>
      </div>

    </div>
  );
}
