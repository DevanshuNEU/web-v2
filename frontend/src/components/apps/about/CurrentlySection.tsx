import React from "react";
import { motion } from "framer-motion";
import { Target, Monitor, Coffee, Gauge, Star, Dumbbell } from "lucide-react";
import {
  lookingFor, currentlyMastering, readingList, lifeItems, portfolioTechStack,
} from "@/data/aboutMe";

const LIFE_ICONS: Record<string, React.ElementType> = {
  Coffee, Gauge, Star, Dumbbell,
};

export function CurrentlySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 w-full max-w-5xl mx-auto">

      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-text leading-tight">
          Right now <span className="text-accent">in my life</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl">
          What I&apos;m working on, learning, and dealing with day-to-day.
        </p>
      </div>

      {/* Job Hunt */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="text-accent"><Target size={24} /></div>
            <h2 className="text-2xl font-bold text-text">The job hunt is real</h2>
          </div>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>
              Actively looking for Spring 2026 co-ops and full-time opportunities.
              But I&apos;m not just sending out resumes everywhere.
            </p>
            <p>
              I want teams where I can actually contribute. Where my input matters.
              Where I can take charge of meaningful work and make an impact.
            </p>
          </div>
          <div className="glass-subtle rounded-xl p-5 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/5 to-transparent">
            <p className="text-accent font-medium mb-3">What I&apos;m looking for:</p>
            <div className="space-y-2 text-text-secondary">
              {lookingFor.map((item, i) => (
                <p key={i}>→ {item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Academic Life */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-5">
          <h2 className="text-3xl font-bold text-text">MS at Northeastern</h2>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>Graduating December 2026. TAing for Network Structures & Cloud Computing (CSYE6225).</p>
            <p>
              Grading assignments. Holding office hours. Helping students debug their AWS
              infrastructure at 11 PM. Explaining why their database queries are slow.
              Reviewing code. Answering endless questions.
            </p>
            <p>
              It&apos;s exhausting and energizing at the same time. Their questions force me to
              rethink things I thought I understood. Teaching really does make you learn things
              at a deeper level.
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio OS */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="text-accent"><Monitor size={32} /></div>
              <h2 className="text-3xl font-bold text-text">Building Portfolio OS</h2>
            </div>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>You&apos;re literally inside it right now. Started as a weekend project, turned into an ongoing experiment.</p>
              <p>
                Before this, I had a Three.js portfolio that felt... childish. I wanted something
                different. Something uniquely mine. A space where I could express myself without
                worrying about what people think.
              </p>
              <p>
                Saw PostHog&apos;s OS-style website on Hacker News. BAM. That&apos;s it. Their whole vibe — the
                transparency, the writing, the culture — it&apos;s been incredibly inspiring. Would genuinely
                love to work with them someday.
              </p>
            </div>
            <div className="glass-subtle rounded-xl p-6 space-y-3 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/10 to-purple-500/5">
              <div className="text-accent font-medium">Built with:</div>
              <div className="flex flex-wrap gap-2">
                {portfolioTechStack.map(tech => (
                  <span key={tech} className="px-3 py-1 bg-white/10 rounded-full text-sm">{tech}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Stack */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-subtle rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-text mb-4">Currently mastering</h3>
          <div className="space-y-4">
            {currentlyMastering.map(item => (
              <div key={item.name}>
                <div className="font-medium text-text mb-1">{item.name}</div>
                <div className="text-sm text-text-secondary">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-subtle rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-text mb-4">On the reading list</h3>
          <div className="space-y-3 text-text-secondary">
            {readingList.map((item, i) => (
              <p key={i}>→ {item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Beyond Code */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-5">Life beyond code</h2>
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            Still figuring out work-life balance (grad school + TAing + job hunting = organized chaos).
            But I make time for:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {lifeItems.map(item => {
              const Icon = LIFE_ICONS[item.iconName];
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="text-accent mt-1">{Icon && <Icon size={18} />}</div>
                  <div>
                    <div className="font-medium text-text">{item.title}</div>
                    <div className="text-sm">{item.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-text-secondary">
            Oh, and I&apos;m team pineapple on pizza. Don&apos;t @ me.
          </p>
        </div>
      </div>

      {/* Honest Truth */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text">The honest truth</h2>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>
                I&apos;m at that stage where possibilities feel endless but nothing&apos;s guaranteed.
                Building skills, shipping projects, learning constantly, looking for the right
                opportunity to make an impact.
              </p>
              <p>
                Not gonna pretend I have it all figured out. Still learning. Still growing.
                Still making mistakes and learning from them.
              </p>
              <p className="text-text text-xl font-medium">
                But that&apos;s the fun part, right? This journey of continuous learning, building,
                breaking, and improving. That&apos;s what it&apos;s all about.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
