"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { User, Compass, Lightbulb, Activity, Mail } from "lucide-react";
import { IntroSection } from "./about/IntroSection";
import { JourneySection } from "./about/JourneySection";
import { ExcitesSection } from "./about/ExcitesSection";
import { CurrentlySection } from "./about/CurrentlySection";
import { ContactSection } from "./about/ContactSection";

const sections = [
  { id: "intro",     title: "Who I Am",       icon: User,      color: "#007AFF" },
  { id: "journey",   title: "My Journey",     icon: Compass,   color: "#34C759" },
  { id: "excites",   title: "What Excites Me",icon: Lightbulb, color: "#FF9F0A" },
  { id: "currently", title: "Currently",      icon: Activity,  color: "#BF5AF2" },
  { id: "contact",   title: "Get in Touch",   icon: Mail,      color: "#FF375F" },
];

const contentVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

export default function AboutMeApp() {
  const [activeSection, setActiveSection] = useState("intro");
  const trackEvent = useAnalyticsStore(state => state.trackEvent);

  const handleNav = (id: string) => {
    setActiveSection(id);
    const title = sections.find(s => s.id === id)?.title ?? id;
    trackEvent('section_view', `About Me: ${title}`, { section: id });
  };

  const activeColor = sections.find(s => s.id === activeSection)?.color ?? '#007AFF';

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-52 flex-shrink-0 app-sidebar flex flex-col overflow-hidden">
        {/* Section label */}
        <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/6">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            About Me
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 pt-2 space-y-0.5 overflow-auto">
          {sections.map(({ id, title, icon: Icon, color }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`app-nav-item ${isActive ? 'active' : ''}`}
                style={isActive ? { background: `${color}18`, color } : undefined}
              >
                <Icon
                  size={14}
                  style={{ color: isActive ? color : undefined, flexShrink: 0 }}
                />
                <span className="truncate">{title}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer: accent line from selected section */}
        <div
          className="mx-4 mb-4 mt-2 h-0.5 rounded-full transition-all duration-500"
          style={{ background: `linear-gradient(to right, ${activeColor}, transparent)` }}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {activeSection === "intro"     && <IntroSection />}
            {activeSection === "journey"   && <JourneySection />}
            {activeSection === "excites"   && <ExcitesSection />}
            {activeSection === "currently" && <CurrentlySection />}
            {activeSection === "contact"   && <ContactSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
