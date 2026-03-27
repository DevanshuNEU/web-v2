import React from "react";
import { motion } from "framer-motion";
import { Server, Layers, Bot, Rocket } from "lucide-react";

export function ExcitesSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 w-full max-w-5xl mx-auto">
      {/* Hero */}
      <div className="space-y-6">
        <h1 className="text-5xl font-bold text-text leading-tight">
          What gets me
          <br />
          <span className="text-accent">genuinely excited</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl leading-relaxed">
          Beyond the resume points and buzzwords, here's what actually keeps me
          up at night (in a good way).
        </p>
      </div>

      {/* Systems That Scale */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <div className="flex items-start gap-4 mb-5">
          <div className="text-accent flex-shrink-0"><Server size={32} /></div>
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-text">
              Building systems that actually scale
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              There's something satisfying about designing systems that handle
              10x traffic without breaking. Distributed systems, load balancing,
              caching strategies - this is the stuff I think about at 2 AM.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed">
              It's not just about making things work. It's about making complex
              things work <em className="text-text">simply</em>. How do you
              design something that's fault-tolerant, performant, AND
              maintainable? That puzzle never gets old.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-5">
          <h2 className="text-3xl font-bold text-text">Cloud infrastructure</h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            AWS, Terraform, Kubernetes - this is where code meets reality.
            You're not just writing functions; you're orchestrating entire
            environments. Automating deployments. Ensuring things stay up.
          </p>
          <p className="text-text-secondary text-lg leading-relaxed">
            Infrastructure as Code is beautiful. Version-controlled
            infrastructure. Reproducible environments. Automated scaling.
          </p>
        </div>
      </div>

      {/* System Design Love */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent bg-accent/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-accent"><Layers size={24} /></div>
          <h2 className="text-2xl font-bold text-text">
            System design obsession
          </h2>
        </div>
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            While everyone's focused on implementation details, I love zooming
            out. How do services talk to each other? Where are the bottlenecks?
            How does this scale to a million users? What happens when things
            fail?
          </p>
          <p>
            System design isn't just interview prep. It's how you build things
            that work in production. That high-level thinking, solving complex
            problems with elegant solutions -{" "}
            <strong className="text-text">that's the fun part</strong>.
          </p>
        </div>
      </div>

      {/* The Learning Addiction */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">
          The learning never stops
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Bot size={20} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              Claude & AI-assisted development
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Working with Claude and integrating MCPs has completely changed my
              workflow. It's not just code generation - it's having a thinking
              partner. Reviewing code, explaining concepts, helping debug. I'm
              learning faster than ever.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="mb-3 text-accent"><Rocket size={20} /></div>
            <h3 className="font-semibold text-text text-lg mb-3">
              Always building
            </h3>
            <p className="text-text-secondary leading-relaxed">
              I'm never off code. There's always a project, a new concept to
              explore, something to build. Like this Portfolio OS - built it to
              experiment with desktop interactions in the browser and create
              something uniquely mine.
            </p>
          </div>
        </div>

        <div className="glass-subtle rounded-xl p-6 border border-accent/30 backdrop-blur-xl bg-gradient-to-br from-accent/5 to-purple-500/5">
          <p className="text-accent font-medium mb-3">Currently learning:</p>
          <div className="grid md:grid-cols-3 gap-4 text-text-secondary">
            <div>
              <div className="font-medium text-text mb-1">Go/Golang</div>
              <div className="text-sm">High-performance microservices</div>
            </div>
            <div>
              <div className="font-medium text-text mb-1">Advanced K8s</div>
              <div className="text-sm">Container orchestration at scale</div>
            </div>
            <div>
              <div className="font-medium text-text mb-1">System Design</div>
              <div className="text-sm">
                Thinking at scale, designing for failure
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What Really Matters */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text">
              Technology that actually matters
            </h2>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>
                Here's what really drives me: building things that solve real
                problems. Not tech for tech's sake.
              </p>
              <p>
                Whether it's optimizing an API so users don't wait, building
                infrastructure that doesn't crash at 3 AM, or creating
                interfaces people can actually use - it's all about impact.
              </p>
              <p className="text-text text-xl font-medium">
                Technology that makes someone's life easier, businesses more
                efficient, or impossible things possible. That's what I'm here
                for.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PostHog Inspiration */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-text">
            Speaking of things that inspire me
          </h3>
          <p className="text-text-secondary text-lg leading-relaxed">
            PostHog's entire approach - their writing, their culture, their
            transparency. The way they build in public, share knowledge openly,
            and maintain that balance between fun and focused? That's the kind
            of environment I want to be part of.
          </p>
          <p className="text-text-secondary text-lg leading-relaxed">
            Their website redesign (the OS-style one) literally inspired this
            portfolio you're looking at right now. Would genuinely love to work
            with teams like that.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
