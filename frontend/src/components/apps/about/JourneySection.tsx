import React from "react";
import { motion } from "framer-motion";
import { Zap, Disc, Lightbulb, Palette, Smartphone, Clock } from "lucide-react";

export function JourneySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 w-full max-w-5xl mx-auto">
      {/* Hero Opening */}
      <div className="space-y-6">
        <h1 className="text-5xl font-bold text-text leading-tight">
          It started with a laptop
          <br />
          <span className="text-accent">and way too much curiosity</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl leading-relaxed">
          I was 8 when dad brought home our first laptop. Obviously, I went
          straight for the games. But something else caught my attention too...
        </p>
      </div>

      {/* The "Mind Blown" Moment */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="flex items-start gap-4">
          <div className="text-accent flex-shrink-0"><Zap size={32} /></div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-text">
              Google. Just... Google.
            </h3>
            <p className="text-text-secondary text-lg leading-relaxed">
              This thing had answers to{" "}
              <em className="text-text">literally everything</em>. You could
              type any question and get an answer. You could download games
              online and play them on your computer.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed">
              That's when it hit me - computers weren't just for playing games.
              They were something way bigger.
            </p>
          </div>
        </div>
      </div>

      {/* The Rohan Memory */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 bg-accent/10 rounded-full text-sm text-accent font-medium mb-2">
            ~2005
          </div>
          <h3 className="text-2xl font-bold text-text">
            My friend Rohan had internet
          </h3>
          <p className="text-text-secondary text-lg leading-relaxed">
            His mom would definitely scold us if she caught us gaming, so we'd
            wait until she wasn't around. The thrill of sneaking those sessions?
            That made it even better.
          </p>
          <blockquote className="pl-6 border-l-4 border-accent/50 italic text-text text-lg my-6">
            "CoolROMs, GBA emulator, Vice City, Prince of Persia, Aladdin -
            every game was a new world to explore."
          </blockquote>
          <p className="text-text-secondary text-lg leading-relaxed">
            Every discovery made me want to dig deeper. What else could these
            machines do?
          </p>
        </div>
      </div>

      {/* The Weekend Ritual */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <div className="flex items-start gap-6">
          <div className="text-accent flex-shrink-0"><Disc size={40} /></div>
          <div className="flex-1 space-y-5">
            <h3 className="text-2xl font-bold text-text">
              Every Friday: Digit magazine day
            </h3>
            <p className="text-text-secondary text-lg leading-relaxed">
              A new Digit magazine would show up with a CD full of software and
              games. Weekends became my exploration time.
            </p>
            <div className="glass-subtle rounded-xl p-5 space-y-3 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent backdrop-blur-xl">
              <div className="text-sm font-mono text-accent font-semibold">
                My weekend routine:
              </div>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">
                    Install every single thing on that CD, see what works
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">
                    Share CDs with friends (before cloud storage was even a
                    thing)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">
                    Break things, fix them, learn something new
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Microsoft Encarta Breakthrough */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="text-accent"><Lightbulb size={32} /></div>
              <h3 className="text-3xl font-bold text-text">
                Then I discovered Microsoft Encarta
              </h3>
            </div>

            <div className="glass-subtle rounded-xl p-6 space-y-4 border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent backdrop-blur-xl shadow-lg">
              <div className="text-accent font-semibold text-xl">
                This changed everything.
              </div>
              <p className="text-text-secondary text-lg leading-relaxed">
                Hours would just disappear. Science, history, world wars,
                mythology, animal facts - I'd just click through topic after
                topic. Learning became addictive in the best way possible.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="glass-subtle rounded-xl p-5 border border-white/10 hover:border-accent/30 transition-colors">
                <div className="mb-3 text-accent"><Palette size={24} /></div>
                <h4 className="font-semibold text-text text-lg mb-2">
                  Delux Paint
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  I'd make these digital paintings and show them to my
                  grandfather. The way his face would light up? That made every
                  creation worth it.
                </p>
              </div>
              <div className="glass-subtle rounded-xl p-5 border border-white/10 hover:border-accent/30 transition-colors">
                <div className="mb-3 text-accent"><Smartphone size={24} /></div>
                <h4 className="font-semibold text-text text-lg mb-2">
                  Android Ice Cream Sandwich
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Dad's Garmin touchscreen phone. First time using Android. That
                  touchscreen interface? I was hooked from day one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Coding Click */}
      <div className="space-y-6">
        <div className="inline-block px-4 py-2 bg-accent/10 rounded-full text-accent font-medium">
          The moment it clicked
        </div>
        <h2 className="text-4xl font-bold text-text">
          10th standard.
          <br />
          <code className="text-3xl px-3 py-1 bg-black/30 rounded font-mono text-accent">
            printf("Hello World")
          </code>
        </h2>

        <div className="space-y-5 text-text-secondary text-lg leading-relaxed max-w-3xl">
          <p>
            My first C program. I remember thinking it was the coolest thing
            ever. Then I discovered for loops and started making all these
            different patterns. The possibilities felt endless.
          </p>
          <div className="pl-6 border-l-4 border-accent/50 text-text text-xl font-medium italic">
            That's when I knew - I wanted to be a software engineer.
          </div>
        </div>
      </div>

      {/* The 2-Month Struggle */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="text-accent flex-shrink-0"><Clock size={32} /></div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-text mb-3">
                My first "real" project took 2 months
              </h3>
              <p className="text-text-secondary text-lg leading-relaxed">
                Database management system for a library. Simple concept, right?
                Wrong. So many errors. OOP concepts I didn't really understand
                yet. Failed attempts everywhere.
              </p>
            </div>
          </div>

          <div className="glass-subtle rounded-xl p-5 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/5 to-transparent">
            <p className="text-text-secondary leading-relaxed">
              Honestly, I was disappointed at first. But I kept at it.{" "}
              <strong className="text-text">Slowly, slowly</strong>, things
              started working. Bugs got fixed. Logic made sense.
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-accent font-medium">Biggest lesson?</p>
              <p className="text-text-secondary mt-2">
                Stay calm. Most errors are just silly mistakes. Patience wins
                over frustration every single time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* React & Promises */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">
          React confused the hell out of me
        </h2>

        <div className="glass-subtle rounded-xl p-6 border-l-4 border-accent bg-accent/5">
          <p className="text-text text-lg italic leading-relaxed">
            "Why React when we literally have HTML, CSS, and JavaScript?"
          </p>
          <p className="text-text-secondary mt-3">
            Me, for like 3 months straight
          </p>
        </div>

        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            Getting comfortable with promises, understanding why React even
            existed, figuring out the difference between all these frameworks -
            steep learning curve doesn't even cover it.
          </p>
          <p>
            But when it finally clicked?{" "}
            <strong className="text-text font-semibold">
              Everything changed
            </strong>
            . Building complex UIs suddenly made sense. Components made sense.
            The whole ecosystem clicked into place.
          </p>
        </div>

        <div className="glass-subtle rounded-xl p-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent backdrop-blur-xl">
          <p className="text-accent font-medium mb-2">
            I started noticing a pattern:
          </p>
          <p className="text-text-secondary">
            The confusion is always part of learning. You push through it,
            things click, and suddenly you've unlocked a whole new set of
            capabilities.
          </p>
        </div>
      </div>

      {/* Industry Reality */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-5">
          Then came internships
        </h2>
        <div className="space-y-5 text-text-secondary text-lg leading-relaxed">
          <p>
            Turns out software engineering isn't just writing code. It's
            understanding what problem you're actually solving. Communicating
            with teams. Making trade-offs. Sometimes choosing{" "}
            <span className="text-text font-medium">"good enough"</span> over{" "}
            <span className="text-text font-medium">"perfect"</span> because
            shipping matters.
          </p>
          <p>
            Working on real systems - optimizing APIs for actual users, building
            infrastructure that needs to stay up, solving problems that impact
            real people's work.
          </p>
          <p className="text-text text-xl font-medium">
            That's what I'm here for. That's what gets me excited.
          </p>
        </div>
      </div>

      {/* Northeastern */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-5">
          <div className="inline-block px-3 py-1 bg-accent/10 rounded-full text-sm text-accent font-medium">
            Right now
          </div>
          <h2 className="text-3xl font-bold text-text">
            Northeastern & being a TA
          </h2>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>
              Came to Northeastern for my MS because I wanted to fill knowledge
              gaps and learn from people way smarter than me.
            </p>
            <p>
              TAing for Network Structures & Cloud Computing and databases? It's
              humbling. Try explaining why their AWS infrastructure isn't
              working at 11 PM. Nothing tests whether you actually understand
              something like teaching it.
            </p>
          </div>
          <div className="glass-subtle rounded-xl p-5 bg-accent/5 border border-accent/20">
            <p className="text-text-secondary">
              It's exhausting sometimes. Grading assignments, holding office
              hours, debugging students' code. But when someone's stuck for
              hours and you help them figure it out? When they actually get it
              and their code finally works? That feeling's different. Worth it.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
