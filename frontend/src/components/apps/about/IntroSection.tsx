import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  MapPin,
  GraduationCap,
  Gamepad2,
  Disc,
  Monitor,
  Rocket,
  Bot,
  Gauge,
  Flame,
} from "lucide-react";

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
              src="/devanshu-photo.png"
              alt="Devanshu Chicholikar"
              width={160}
              height={160}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        <h1 className="text-4xl font-bold text-text mb-2">
          Devanshu Chicholikar
        </h1>
        <p className="text-xl text-text-secondary mb-4">Software Engineer</p>

        <div className="flex items-center justify-center gap-6 text-sm text-text-secondary mb-6">
          <span className="flex items-center gap-2">
            <MapPin size={16} />
            Boston, MA
          </span>
          <span className="flex items-center gap-2">
            <GraduationCap size={16} />
            MS at Northeastern
          </span>
        </div>

        <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
          Open to Spring 2026 Co-op + Full-time Opportunities
        </div>
      </div>

      {/* Quick Intro */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            Hey! I build systems that actually work at scale. Currently
            finishing my MS at Northeastern while TAing for Network Structures &
            Cloud Computing.
          </p>
          <p>
            I genuinely love solving complex problems - whether it's optimizing
            APIs, architecting fault-tolerant infrastructure, or building tools
            that people actually use. The challenge of making complex things
            work simply? That's what gets me excited.
          </p>
        </div>
      </div>

      {/* The Origin Story */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">How it started</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Gamepad2 size={28} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              The 8-year-old kid
            </h3>
            <p className="text-text-secondary leading-relaxed">
              My father brought home our first laptop. I went straight for the
              games, but Google blew my mind. This thing had answers to
              everything. That curiosity never stopped - it just got more
              focused.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Disc size={28} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              Digit magazine weekends
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Every Friday, new CDs full of software to explore. Those weekends
              shaped everything - breaking things, fixing them, learning how
              computers actually work. That hands-on exploration became my
              approach to learning.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Monitor size={28} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              The "Hello World" moment
            </h3>
            <p className="text-text-secondary leading-relaxed">
              10th standard. First C program. Discovered for loops and pattern
              making. Right there, I knew - I wanted to be a software engineer.
              Not just use technology, but build it.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Rocket size={28} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              Building real things
            </h3>
            <p className="text-text-secondary leading-relaxed">
              From struggling with a 2-month library database project to
              optimizing APIs at internships. Every failure taught patience.
              Every success unlocked new capabilities. That's still how I
              approach problems today.
            </p>
          </div>
        </div>
      </div>

      {/* What I'm About */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text">What I'm about</h2>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>
                I build systems that work reliably under pressure. Distributed
                systems. Cloud infrastructure. APIs that respond fast. UIs that
                people can actually use.
              </p>
              <p>
                But it's not just about the tech. It's about understanding the
                problem, communicating with teams, making smart trade-offs, and
                shipping things that matter.
              </p>
              <p className="text-text text-xl font-medium">
                I'm here to learn, grow, and work on projects that actually make
                a difference. Always excited about opportunities that push
                boundaries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fun Facts */}
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-text mb-4">Quick facts</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-text-secondary">
          <div>
            <div className="font-medium text-text mb-1 flex items-center gap-1.5">
              <Bot size={14} /> Current workflow
            </div>
            <div>Claude + MCPs = learning on steroids</div>
          </div>
          <div>
            <div className="font-medium text-text mb-1 flex items-center gap-1.5"><Gauge size={14} /> F1 enthusiast</div>
            <div>Max Verstappen fan, love the engineering</div>
          </div>
          <div>
            <div className="font-medium text-text mb-1 flex items-center gap-1.5"><Flame size={14} /> Hot take</div>
            <div>Team pineapple on pizza, fight me</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
