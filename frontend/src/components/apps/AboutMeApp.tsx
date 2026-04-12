"use client";

/**
 * AboutMeApp — "About Devanshu"
 *
 * Inspired by macOS "About This Mac" — the OS itself revealing the developer's
 * system specifications. Meta, witty, instantly scannable, completely unexpected
 * on a portfolio. Nobody else has done this.
 *
 * Layout:
 *   Top strip  — photo + name + title (always visible)
 *   Tab bar    — horizontal tabs (Overview | Journey | What Excites Me | Currently | Contact)
 *   Content    — Overview is the specs table; other tabs use existing section components
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink, Mail, Linkedin, Github, MapPin, GraduationCap } from "lucide-react";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { identity, contactLinks } from "@/data/aboutMe";
import { JourneySection } from "./about/JourneySection";
import { ExcitesSection } from "./about/ExcitesSection";
import { CurrentlySection } from "./about/CurrentlySection";
import { ContactSection } from "./about/ContactSection";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { id: "overview",  label: "Overview"       },
  { id: "journey",   label: "Journey"        },
  { id: "excites",   label: "What Excites Me"},
  { id: "currently", label: "Currently"      },
  { id: "contact",   label: "Contact"        },
] as const;

type TabId = typeof TABS[number]['id'];

// ---------------------------------------------------------------------------
// Overview — "About This Mac" specs table
// ---------------------------------------------------------------------------

const SPECS = [
  { key: "Model",      value: "Human, Software Edition"           },
  { key: "Version",    value: "v26.0 (Dec 2026 build)"            },
  { key: "Processor",  value: "TypeScript · React · AWS · Node.js" },
  { key: "Memory",     value: "16TB of Stack Overflow wisdom"      },
  { key: "Storage",    value: "MS @ Northeastern + B.Tech @ DAIICT"},
  { key: "Serial No.", value: "#OpenToWork"                        },
] as const;

function OverviewTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center h-full px-8 py-10 gap-10"
    >
      {/* Specs table */}
      <div className="w-full max-w-lg glass-subtle rounded-2xl border border-white/10 overflow-hidden">
        {SPECS.map(({ key, value }, i) => (
          <div
            key={key}
            className={`flex items-baseline gap-4 px-6 py-3.5 ${
              i < SPECS.length - 1 ? "border-b border-black/5 dark:border-white/5" : ""
            }`}
          >
            <span className="text-xs text-text-secondary text-right w-24 flex-shrink-0 font-medium">
              {key}
            </span>
            <span className="text-sm text-text font-mono leading-snug">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <a
          href={contactLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-subtle border border-white/10
                     text-sm text-text-secondary hover:text-accent hover:border-accent/30
                     transition-all duration-150"
        >
          <Linkedin size={14} />
          LinkedIn
          <ExternalLink size={11} className="opacity-50" />
        </a>
        <a
          href={contactLinks.github}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-subtle border border-white/10
                     text-sm text-text-secondary hover:text-accent hover:border-accent/30
                     transition-all duration-150"
        >
          <Github size={14} />
          GitHub
          <ExternalLink size={11} className="opacity-50" />
        </a>
        <a
          href={`mailto:${contactLinks.email}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-accent text-white text-sm font-medium
                     hover:bg-accent/90 transition-all duration-150"
        >
          <Mail size={14} />
          Email Me
        </a>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Content variants
// ---------------------------------------------------------------------------

const contentVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.15, ease: "easeIn" as const } },
};

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

export default function AboutMeApp() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const trackEvent = useAnalyticsStore(state => state.trackEvent);

  const handleTab = (id: TabId) => {
    setActiveTab(id);
    trackEvent("section_view", `About Me: ${id}`, { section: id });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Identity strip ── */}
      <div className="flex items-center gap-5 px-6 py-4 border-b border-black/6 dark:border-white/6 flex-shrink-0">
        {/* Photo */}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/20"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
          <Image
            src={identity.photo}
            alt={identity.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-text leading-tight">
              {identity.name}
            </h1>
            {/* Availability badge — inline with name */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                             bg-green-500/10 border border-green-500/20
                             text-green-600 dark:text-green-400 text-[10px] font-medium flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Available
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-tight mt-0.5">
            {identity.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {identity.location}
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap size={10} />
              {identity.school}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-black/6 dark:border-white/6 flex-shrink-0">
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-accent/12 text-accent"
                  : "text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full"
          >
            {activeTab === "overview"  && <OverviewTab />}
            {activeTab === "journey"   && <JourneySection />}
            {activeTab === "excites"   && <ExcitesSection />}
            {activeTab === "currently" && <CurrentlySection />}
            {activeTab === "contact"   && <ContactSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
