"use client";

/**
 * AboutMeApp
 *
 * Personal bio with sidebar navigation.
 * Tracks section views for analytics.
 */

import React, { useState, useEffect } from "react";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { User, Compass, Lightbulb, Activity, Mail } from "lucide-react";
import { IntroSection } from "./about/IntroSection";
import { JourneySection } from "./about/JourneySection";
import { ExcitesSection } from "./about/ExcitesSection";
import { CurrentlySection } from "./about/CurrentlySection";
import { ContactSection } from "./about/ContactSection";

const sections = [
  { id: "intro", title: "Who I Am", icon: User },
  { id: "journey", title: "My Journey", icon: Compass },
  { id: "excites", title: "What Excites Me", icon: Lightbulb },
  { id: "currently", title: "Currently", icon: Activity },
  { id: "contact", title: "Get in Touch", icon: Mail },
];

export default function AboutMeApp() {
  const [activeSection, setActiveSection] = useState("intro");
  const trackEvent = useAnalyticsStore(state => state.trackEvent);

  // Track section changes
  useEffect(() => {
    const sectionName = sections.find(s => s.id === activeSection)?.title || activeSection;
    trackEvent('section_view', `About Me: ${sectionName}`, { section: activeSection });
  }, [activeSection, trackEvent]);

  return (
    <div className="h-full flex bg-surface/30">
      {/* Sidebar */}
      <div className="w-56 glass-subtle border-r border-white/10 p-4 flex flex-col gap-2">
        <h2 className="text-sm font-bold text-text mb-2 px-3 pb-2 border-b border-white/10">
          About Me
        </h2>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 text-sm
                ${
                  activeSection === section.id
                    ? "bg-accent/20 text-accent font-medium"
                    : "text-text-secondary hover:text-text hover:bg-surface/50"
                }
              `}>
              <Icon size={16} />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeSection === "intro" && <IntroSection />}
        {activeSection === "journey" && <JourneySection />}
        {activeSection === "excites" && <ExcitesSection />}
        {activeSection === "currently" && <CurrentlySection />}
        {activeSection === "contact" && <ContactSection />}
      </div>
    </div>
  );
}
