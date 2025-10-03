'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  User, 
  Compass, 
  Lightbulb, 
  Activity, 
  Mail,
  MapPin,
  GraduationCap,
  Github,
  Linkedin,
  ExternalLink
} from 'lucide-react';

const sections = [
  { id: 'intro', title: 'Who I Am', icon: User },
  { id: 'journey', title: 'My Journey', icon: Compass },
  { id: 'excites', title: 'What Excites Me', icon: Lightbulb },
  { id: 'currently', title: 'Currently', icon: Activity },
  { id: 'contact', title: 'Get in Touch', icon: Mail }
];

export default function AboutMeApp() {
  const [activeSection, setActiveSection] = useState('intro');

  return (
    <div className="h-full flex bg-surface/30">
      {/* Sidebar - Glass */}
      <div className="w-56 glass-subtle border-r border-white/10 p-4 flex flex-col gap-2">
        <h2 className="text-sm font-bold text-text mb-2 px-3 pb-2 border-b border-white/10">About Me</h2>
        
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 text-sm
                ${activeSection === section.id
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-text-secondary hover:text-text hover:bg-surface/50'
                }
              `}
            >
              <Icon size={16} />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeSection === 'intro' && <IntroSection />}
        {activeSection === 'journey' && <JourneySection />}
        {activeSection === 'excites' && <ExcitesSection />}
        {activeSection === 'currently' && <CurrentlySection />}
        {activeSection === 'contact' && <ContactSection />}
      </div>
    </div>
  );
}

// Intro Section
function IntroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full"
    >
      {/* Hero */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mb-6 inline-block"
        >
          <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-accent/20 shadow-xl">
            <Image
              src="/devanshu-photo.png"
              alt="Devanshu Chicholikar"
              width={160}
              height={160}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        <h1 className="text-3xl font-bold text-text mb-2">
          Devanshu Chicholikar
        </h1>
        <p className="text-lg text-text-secondary mb-4">Software Engineer</p>

        <div className="flex items-center justify-center gap-6 text-sm text-text-secondary mb-6">
          <span className="flex items-center gap-2">
            <MapPin size={16} />
            Boston, MA
          </span>
          <span className="flex items-center gap-2">
            <GraduationCap size={16} />
            MS Student at Northeastern
          </span>
        </div>

        <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
          Spring 2026 Co-op + Full-time Opportunities
        </div>
      </div>

      {/* Story Cards */}
      <div className="space-y-6">
        <div className="glass-subtle rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-text mb-4">
            How It All Started
          </h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              I was eight years old when my father brought home our first laptop. 
              Watching that machine do incredible things with just a few clicks completely 
              blew my mind. The curiosity did not stop there - it only grew stronger.
            </p>
            <p>
              Those Digit magazine CDs and endless hours exploring what computers 
              could do shaped everything. That kid who was fascinated by technology 
              is now building distributed systems and solving complex engineering challenges.
            </p>
            <p>
              Today, I am working through my MS at Northeastern while actively looking 
              for Spring 2026 co-ops and full-time opportunities. I am here to learn, 
              grow, and work on projects that actually matter. Always excited about 
              crazy opportunities that push boundaries.
            </p>
          </div>
        </div>

        <div className="glass-subtle rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-text mb-4">
            What I Am About
          </h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              I genuinely enjoy building systems that work reliably at scale. 
              Whether it is optimizing APIs for better performance or architecting 
              fault-tolerant infrastructure, I care about the details that make 
              software actually usable.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Journey Section
function JourneySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full"
    >
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-4">My Journey</h2>
        <p className="text-text-secondary">Content coming soon...</p>
      </div>
    </motion.div>
  );
}

// What Excites Me Section
function ExcitesSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full"
    >
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-4">What Excites Me</h2>
        <p className="text-text-secondary">Content coming soon...</p>
      </div>
    </motion.div>
  );
}

// Currently Section  
function CurrentlySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full"
    >
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-4">Currently</h2>
        <p className="text-text-secondary">Content coming soon...</p>
      </div>
    </motion.div>
  );
}

// Contact Section
function ContactSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full"
    >
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-4">Let's Connect</h2>

        <div className="space-y-4">
          <p className="text-text-secondary mb-6">
            Always open to discussing opportunities, collaborations, or just chatting about tech.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="mailto:chicholikar.d@northeastern.edu"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent text-white
                       hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02]"
            >
              <Mail size={18} />
              <span className="font-medium">chicholikar.d@northeastern.edu</span>
            </a>

            <a
              href="https://www.linkedin.com/in/devanshuchicholikar/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl
                       glass-subtle border border-white/20 hover:border-accent/50
                       transition-all duration-200 hover:scale-[1.02] text-text"
            >
              <div className="flex items-center gap-3">
                <Linkedin size={18} />
                <span className="font-medium">LinkedIn</span>
              </div>
              <ExternalLink size={16} className="text-text-secondary" />
            </a>

            <a
              href="https://github.com/devanshuNEU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl
                       glass-subtle border border-white/20 hover:border-accent/50
                       transition-all duration-200 hover:scale-[1.02] text-text"
            >
              <div className="flex items-center gap-3">
                <Github size={18} />
                <span className="font-medium">GitHub</span>
              </div>
              <ExternalLink size={16} className="text-text-secondary" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
