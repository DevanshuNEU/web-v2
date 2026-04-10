import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  MapPin, GraduationCap,
  Gamepad2, Disc, Monitor, Rocket,
  Bot, Gauge, Flame,
} from "lucide-react";
import {
  identity, quickIntro, originStory, whatImAbout, funFacts,
} from "@/data/aboutMe";

// Map icon name strings from data to actual Lucide components
const ORIGIN_ICONS: Record<string, React.ElementType> = {
  Gamepad2, Disc, Monitor, Rocket,
};

const FUN_FACT_ICONS: Record<string, React.ElementType> = {
  Bot, Gauge, Flame,
};

export function IntroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 w-full max-w-5xl mx-auto">

      {/* Hero */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mb-6 inline-block">
          <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-accent/20 shadow-xl">
            <Image
              src={identity.photo}
              alt={identity.name}
              width={160}
              height={160}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        <h1 className="text-4xl font-bold text-text mb-2">{identity.name}</h1>
        <p className="text-xl text-text-secondary mb-4">{identity.title}</p>

        <div className="flex items-center justify-center gap-6 text-sm text-text-secondary mb-6">
          <span className="flex items-center gap-2">
            <MapPin size={16} />
            {identity.location}
          </span>
          <span className="flex items-center gap-2">
            <GraduationCap size={16} />
            {identity.school}
          </span>
        </div>

        <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
          {identity.availability}
        </div>
      </div>

      {/* Quick Intro */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          {quickIntro.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </div>

      {/* Origin Story */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">How it started</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {originStory.map((card) => {
            const Icon = ORIGIN_ICONS[card.iconName];
            return (
              <div key={card.title} className="glass-subtle rounded-xl p-6 border border-white/10">
                <div className="mb-3 text-accent">{Icon && <Icon size={28} />}</div>
                <h3 className="font-semibold text-text text-lg mb-3">{card.title}</h3>
                <p className="text-text-secondary leading-relaxed">{card.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* What I'm About */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text">What I&apos;m about</h2>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              {whatImAbout.map((para, i) => (
                <p key={i} className={i === whatImAbout.length - 1 ? "text-text text-xl font-medium" : undefined}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fun Facts */}
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-text mb-4">Quick facts</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-text-secondary">
          {funFacts.map((fact) => {
            const Icon = FUN_FACT_ICONS[fact.iconName];
            return (
              <div key={fact.label}>
                <div className="font-medium text-text mb-1 flex items-center gap-1.5">
                  {Icon && <Icon size={14} />}
                  {fact.label}
                </div>
                <div>{fact.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
