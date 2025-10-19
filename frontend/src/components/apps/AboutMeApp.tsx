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
      {/* Sidebar */}
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
      className="p-8 space-y-8 w-full max-w-5xl mx-auto"
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
            Hey! I build systems that actually work at scale. Currently finishing my MS at Northeastern while TAing 
            for cloud computing and databases.
          </p>
          <p>
            I genuinely love solving complex problems - whether it's optimizing APIs, architecting fault-tolerant 
            infrastructure, or building tools that people actually use. The challenge of making complex things work 
            simply? That's what gets me excited.
          </p>
        </div>
      </div>

      {/* The Origin Story */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">How it started</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">🎮</div>
            <h3 className="font-semibold text-text text-lg mb-3">The 8-year-old kid</h3>
            <p className="text-text-secondary leading-relaxed">
              My father brought home our first laptop. I went straight for the games, but Google blew my mind. 
              This thing had answers to everything. That curiosity never stopped - it just got more focused.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">📀</div>
            <h3 className="font-semibold text-text text-lg mb-3">Digit magazine weekends</h3>
            <p className="text-text-secondary leading-relaxed">
              Every Friday, new CDs full of software to explore. Those weekends shaped everything - breaking things, 
              fixing them, learning how computers actually work. That hands-on exploration became my approach to learning.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">💻</div>
            <h3 className="font-semibold text-text text-lg mb-3">The "Hello World" moment</h3>
            <p className="text-text-secondary leading-relaxed">
              10th standard. First C program. Discovered for loops and pattern making. Right there, I knew - 
              I wanted to be a software engineer. Not just use technology, but build it.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold text-text text-lg mb-3">Building real things</h3>
            <p className="text-text-secondary leading-relaxed">
              From struggling with a 2-month library database project to optimizing APIs at internships. Every failure 
              taught patience. Every success unlocked new capabilities. That's still how I approach problems today.
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
                I build systems that work reliably under pressure. Distributed systems. Cloud infrastructure. 
                APIs that respond fast. UIs that people can actually use.
              </p>
              <p>
                But it's not just about the tech. It's about understanding the problem, communicating with teams, 
                making smart trade-offs, and shipping things that matter.
              </p>
              <p className="text-text text-xl font-medium">
                I'm here to learn, grow, and work on projects that actually make a difference. 
                Always excited about opportunities that push boundaries.
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
            <div className="font-medium text-text mb-1">🤖 Current workflow</div>
            <div>Claude + MCPs = learning on steroids</div>
          </div>
          <div>
            <div className="font-medium text-text mb-1">🏎️ F1 enthusiast</div>
            <div>Max Verstappen fan, love the engineering</div>
          </div>
          <div>
            <div className="font-medium text-text mb-1">🍍 Hot take</div>
            <div>Team pineapple on pizza, fight me</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Journey Section - YOUR AUTHENTIC STORY
function JourneySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 w-full max-w-5xl mx-auto"
    >
      {/* Hero Opening */}
      <div className="space-y-6">
        <h1 className="text-5xl font-bold text-text leading-tight">
          It started with a laptop<br />
          <span className="text-accent">and way too much curiosity</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl leading-relaxed">
          I was 8 when dad brought home our first laptop. Obviously, I went straight for the games.
          But something else caught my attention too...
        </p>
      </div>

      {/* The "Mind Blown" Moment */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🤯</div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-text">Google. Just... Google.</h3>
            <p className="text-text-secondary text-lg leading-relaxed">
              This thing had answers to <em className="text-text">literally everything</em>. You could 
              type any question and get an answer. You could download games online and play them on your computer. 
            </p>
            <p className="text-text-secondary text-lg leading-relaxed">
              That's when it hit me - computers weren't just for playing games. They were something way bigger.
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
          <h3 className="text-2xl font-bold text-text">My friend Rohan had internet</h3>
          <p className="text-text-secondary text-lg leading-relaxed">
            His mom would definitely scold us if she caught us gaming, so we'd wait until she wasn't around. 
            The thrill of sneaking those sessions? That made it even better.
          </p>
          <blockquote className="pl-6 border-l-4 border-accent/50 italic text-text text-lg my-6">
            "CoolROMs, GBA emulator, Vice City, Prince of Persia, Aladdin - every game was a new world to explore."
          </blockquote>
          <p className="text-text-secondary text-lg leading-relaxed">
            Every discovery made me want to dig deeper. What else could these machines do?
          </p>
        </div>
      </div>

      {/* The Weekend Ritual */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <div className="flex items-start gap-6">
          <div className="text-5xl flex-shrink-0">📀</div>
          <div className="flex-1 space-y-5">
            <h3 className="text-2xl font-bold text-text">Every Friday: Digit magazine day</h3>
            <p className="text-text-secondary text-lg leading-relaxed">
              A new Digit magazine would show up with a CD full of software and games. Weekends became my 
              exploration time.
            </p>
            <div className="glass-subtle rounded-xl p-5 space-y-3 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent backdrop-blur-xl">
              <div className="text-sm font-mono text-accent font-semibold">My weekend routine:</div>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">Install every single thing on that CD, see what works</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">Share CDs with friends (before cloud storage was even a thing)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1 text-lg">→</span>
                  <span className="text-base">Break things, fix them, learn something new</span>
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
              <div className="text-4xl">💡</div>
              <h3 className="text-3xl font-bold text-text">Then I discovered Microsoft Encarta</h3>
            </div>
            
            <div className="glass-subtle rounded-xl p-6 space-y-4 border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent backdrop-blur-xl shadow-lg">
              <div className="text-accent font-semibold text-xl">This changed everything.</div>
              <p className="text-text-secondary text-lg leading-relaxed">
                Hours would just disappear. Science, history, world wars, mythology, animal facts - I'd just 
                click through topic after topic. Learning became addictive in the best way possible.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="glass-subtle rounded-xl p-5 border border-white/10 hover:border-accent/30 transition-colors">
                <div className="text-3xl mb-3">🎨</div>
                <h4 className="font-semibold text-text text-lg mb-2">Delux Paint</h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  I'd make these digital paintings and show them to my grandfather. The way his face would light up? 
                  That made every creation worth it.
                </p>
              </div>
              <div className="glass-subtle rounded-xl p-5 border border-white/10 hover:border-accent/30 transition-colors">
                <div className="text-3xl mb-3">📱</div>
                <h4 className="font-semibold text-text text-lg mb-2">Android Ice Cream Sandwich</h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Dad's Garmin touchscreen phone. First time using Android. That touchscreen interface? 
                  I was hooked from day one.
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
          10th standard.<br />
          <code className="text-3xl px-3 py-1 bg-black/30 rounded font-mono text-accent">
            printf("Hello World")
          </code>
        </h2>
        
        <div className="space-y-5 text-text-secondary text-lg leading-relaxed max-w-3xl">
          <p>
            My first C program. I remember thinking it was the coolest thing ever. Then I discovered 
            for loops and started making all these different patterns. The possibilities felt endless.
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
            <div className="text-4xl">😤</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-text mb-3">My first "real" project took 2 months</h3>
              <p className="text-text-secondary text-lg leading-relaxed">
                Database management system for a library. Simple concept, right? Wrong. So many errors. 
                OOP concepts I didn't really understand yet. Failed attempts everywhere.
              </p>
            </div>
          </div>
          
          <div className="glass-subtle rounded-xl p-5 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/5 to-transparent">
            <p className="text-text-secondary leading-relaxed">
              Honestly, I was disappointed at first. But I kept at it. <strong className="text-text">Slowly, 
              slowly</strong>, things started working. Bugs got fixed. Logic made sense.
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-accent font-medium">Biggest lesson?</p>
              <p className="text-text-secondary mt-2">
                Stay calm. Most errors are just silly mistakes. Patience wins over frustration every single time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* React & Promises */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">React confused the hell out of me</h2>
        
        <div className="glass-subtle rounded-xl p-6 border-l-4 border-accent bg-accent/5">
          <p className="text-text text-lg italic leading-relaxed">
            "Why React when we literally have HTML, CSS, and JavaScript?"
          </p>
          <p className="text-text-secondary mt-3">
            — Me, for like 3 months straight
          </p>
        </div>

        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            Getting comfortable with promises, understanding why React even existed, figuring out the 
            difference between all these frameworks - steep learning curve doesn't even cover it.
          </p>
          <p>
            But when it finally clicked? <strong className="text-text font-semibold">Everything changed</strong>. 
            Building complex UIs suddenly made sense. Components made sense. The whole ecosystem clicked into place.
          </p>
        </div>

        <div className="glass-subtle rounded-xl p-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent backdrop-blur-xl">
          <p className="text-accent font-medium mb-2">I started noticing a pattern:</p>
          <p className="text-text-secondary">
            The confusion is always part of learning. You push through it, things click, and suddenly you've 
            unlocked a whole new set of capabilities.
          </p>
        </div>
      </div>

      {/* Industry Reality */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-5">Then came internships</h2>
        <div className="space-y-5 text-text-secondary text-lg leading-relaxed">
          <p>
            Turns out software engineering isn't just writing code. It's understanding what problem you're 
            actually solving. Communicating with teams. Making trade-offs. Sometimes choosing{' '}
            <span className="text-text font-medium">"good enough"</span> over{' '}
            <span className="text-text font-medium">"perfect"</span> because shipping matters.
          </p>
          <p>
            Working on real systems - optimizing APIs for actual users, building infrastructure that needs to 
            stay up, solving problems that impact real people's work.
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
          <h2 className="text-3xl font-bold text-text">Northeastern & being a TA</h2>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>
              Came to Northeastern for my MS because I wanted to fill knowledge gaps and learn from people 
              way smarter than me.
            </p>
            <p>
              TAing for cloud computing and databases? It's humbling. Try explaining why their AWS infrastructure 
              isn't working at 11 PM. Nothing tests whether you actually understand something like teaching it.
            </p>
          </div>
          <div className="glass-subtle rounded-xl p-5 bg-accent/5 border border-accent/20">
            <p className="text-text-secondary">
              It's exhausting sometimes. Grading assignments, holding office hours, debugging students' code. 
              But when someone's stuck for hours and you help them figure it out? When they actually get it and 
              their code finally works? That feeling's different. Worth it.
            </p>
          </div>
        </div>
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
      className="p-8 space-y-12 w-full max-w-5xl mx-auto"
    >
      {/* Hero */}
      <div className="space-y-6">
        <h1 className="text-5xl font-bold text-text leading-tight">
          What gets me<br />
          <span className="text-accent">genuinely excited</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl leading-relaxed">
          Beyond the resume points and buzzwords, here's what actually keeps me up at night (in a good way).
        </p>
      </div>

      {/* Systems That Scale */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <div className="flex items-start gap-4 mb-5">
          <div className="text-4xl">🏗️</div>
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-text">Building systems that actually scale</h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              There's something satisfying about designing systems that handle 10x traffic without breaking. 
              Distributed systems, load balancing, caching strategies - this is the stuff I think about at 2 AM.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed">
              It's not just about making things work. It's about making complex things work <em className="text-text">simply</em>. 
              How do you design something that's fault-tolerant, performant, AND maintainable? That puzzle never gets old.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-5">
          <h2 className="text-3xl font-bold text-text">Cloud infrastructure</h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            AWS, Terraform, Kubernetes - this is where code meets reality. You're not just writing functions; 
            you're orchestrating entire environments. Automating deployments. Ensuring things stay up.
          </p>
          <p className="text-text-secondary text-lg leading-relaxed">
            Infrastructure as Code is beautiful. Version-controlled infrastructure. Reproducible environments. 
            Automated scaling.
          </p>
        </div>
      </div>

      {/* System Design Love */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent bg-accent/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">🧩</div>
          <h2 className="text-2xl font-bold text-text">System design obsession</h2>
        </div>
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            While everyone's focused on implementation details, I love zooming out. How do services talk to each other? 
            Where are the bottlenecks? How does this scale to a million users? What happens when things fail?
          </p>
          <p>
            System design isn't just interview prep. It's how you build things that work in production. That high-level 
            thinking, solving complex problems with elegant solutions - <strong className="text-text">that's the fun part</strong>.
          </p>
        </div>
      </div>

      {/* The Learning Addiction */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-text">The learning never stops</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-2xl mb-3">🤖</div>
            <h3 className="font-semibold text-text text-lg mb-3">Claude & AI-assisted development</h3>
            <p className="text-text-secondary leading-relaxed">
              Working with Claude and integrating MCPs has completely changed my workflow. It's not just code generation - 
              it's having a thinking partner. Reviewing code, explaining concepts, helping debug. I'm learning faster than ever.
            </p>
          </div>

          <div className="glass-subtle rounded-xl p-6 border border-white/10">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="font-semibold text-text text-lg mb-3">Always building</h3>
            <p className="text-text-secondary leading-relaxed">
              I'm never off code. There's always a project, a new concept to explore, something to build. Like this 
              Portfolio OS - built it to experiment with desktop interactions in the browser and create something uniquely mine.
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
              <div className="text-sm">Thinking at scale, designing for failure</div>
            </div>
          </div>
        </div>
      </div>

      {/* What Really Matters */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative glass-subtle p-8 border border-accent/20">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text">Technology that actually matters</h2>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>
                Here's what really drives me: building things that solve real problems. Not tech for tech's sake.
              </p>
              <p>
                Whether it's optimizing an API so users don't wait, building infrastructure that doesn't crash at 3 AM, 
                or creating interfaces people can actually use - it's all about impact.
              </p>
              <p className="text-text text-xl font-medium">
                Technology that makes someone's life easier, businesses more efficient, or impossible things possible. 
                That's what I'm here for.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PostHog Inspiration */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-text">Speaking of things that inspire me</h3>
          <p className="text-text-secondary text-lg leading-relaxed">
            PostHog's entire approach - their writing, their culture, their transparency. The way they build in public, 
            share knowledge openly, and maintain that balance between fun and focused? That's the kind of environment 
            I want to be part of.
          </p>
          <p className="text-text-secondary text-lg leading-relaxed">
            Their website redesign (the OS-style one) literally inspired this portfolio you're looking at right now. 
            Would genuinely love to work with teams like that.
          </p>
        </div>
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
      className="p-8 space-y-12 w-full max-w-5xl mx-auto"
    >
      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-text leading-tight">
          Right now <span className="text-accent">in my life</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl">
          What I'm working on, learning, and dealing with day-to-day.
        </p>
      </div>

      {/* Job Hunt Reality */}
      <div className="glass-subtle rounded-2xl p-8 border-l-4 border-accent">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎯</div>
            <h2 className="text-2xl font-bold text-text">The job hunt is real</h2>
          </div>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>
              Actively looking for Spring 2026 co-ops and full-time opportunities. But I'm not just sending out resumes everywhere.
            </p>
            <p>
              I want teams where I can actually contribute. Where my input matters. Where I can take charge of meaningful work 
              and make an impact.
            </p>
          </div>
          <div className="glass-subtle rounded-xl p-5 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/5 to-transparent">
            <p className="text-accent font-medium mb-3">What I'm looking for:</p>
            <div className="space-y-2 text-text-secondary">
              <p>→ Teams building things that matter, not just chasing metrics</p>
              <p>→ Places that value engineering excellence and smart decisions</p>
              <p>→ Environment between startup energy and structured growth</p>
              <p>→ Good paycheck + security (being realistic here)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Life */}
      <div className="relative pl-8 border-l-2 border-accent/30">
        <div className="space-y-5">
          <h2 className="text-3xl font-bold text-text">MS at Northeastern</h2>
          <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
            <p>
              Graduating December 2026. TAing for cloud computing (CSYE6225) and databases (DAMG6210).
            </p>
            <p>
              Grading assignments. Holding office hours. Helping students debug their AWS infrastructure at 11 PM. 
              Explaining why their database queries are slow. Reviewing code. Answering endless questions.
            </p>
            <p>
              It's exhausting and energizing at the same time. Their questions force me to rethink things I thought I understood. 
              Teaching really does make you learn things at a deeper level.
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
              <div className="text-4xl">💻</div>
              <h2 className="text-3xl font-bold text-text">Building Portfolio OS</h2>
            </div>
            <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
              <p>
                You're literally inside it right now. Started as a weekend project, turned into an ongoing experiment.
              </p>
              <p>
                Before this, I had a Three.js portfolio that felt... childish. I wanted something different. Something uniquely mine. 
                A space where I could express myself without worrying about what people think.
              </p>
              <p>
                Saw PostHog's OS-style website on Hacker News. BAM. That's it. Their whole vibe - the transparency, the writing, 
                the culture - it's been incredibly inspiring. Would genuinely love to work with them someday.
              </p>
            </div>
            <div className="glass-subtle rounded-xl p-6 space-y-3 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-accent/10 to-purple-500/5">
              <div className="text-accent font-medium">Built with:</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">Next.js 15</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">TypeScript</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">Framer Motion</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">Zustand</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">Tailwind CSS</span>
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
            <div>
              <div className="font-medium text-text mb-1">Go/Golang</div>
              <div className="text-sm text-text-secondary">Building high-performance microservices. The concurrency model is beautiful.</div>
            </div>
            <div>
              <div className="font-medium text-text mb-1">Advanced Kubernetes</div>
              <div className="text-sm text-text-secondary">Container orchestration at scale. Because Docker Compose isn't enough anymore.</div>
            </div>
            <div>
              <div className="font-medium text-text mb-1">System Design</div>
              <div className="text-sm text-text-secondary">Thinking at scale. Designing for failure. The big picture stuff.</div>
            </div>
          </div>
        </div>

        <div className="glass-subtle rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-text mb-4">On the reading list</h3>
          <div className="space-y-3 text-text-secondary">
            <p>→ "Designing Data-Intensive Applications" (the bible)</p>
            <p>→ System design blogs and case studies</p>
            <p>→ AWS whitepapers (yes, actually reading them)</p>
            <p>→ PostHog's engineering blog (inspiration)</p>
          </div>
        </div>
      </div>

      {/* Beyond Code */}
      <div className="glass-subtle rounded-2xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-5">Life beyond code</h2>
        <div className="space-y-4 text-text-secondary text-lg leading-relaxed">
          <p>
            Still figuring out work-life balance (grad school + TAing + job hunting = organized chaos). But I make time for:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">☕</div>
              <div>
                <div className="font-medium text-text">Exploring Boston</div>
                <div className="text-sm">Good coffee shops for coding sessions. The city's got great spots.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🏎️</div>
              <div>
                <div className="font-medium text-text">Following F1</div>
                <div className="text-sm">Max Verstappen fan. Love the strategy, the engineering, the speed.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎉</div>
              <div>
                <div className="font-medium text-text">Staying connected</div>
                <div className="text-sm">Celebrating festivals, staying connected to my roots. Ganesh Chaturthi this year was amazing.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">💪</div>
              <div>
                <div className="font-medium text-text">Staying active</div>
                <div className="text-sm">Gym helps clear the mind after long debugging sessions.</div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-text-secondary">
            Oh, and I'm team pineapple on pizza. 🍍🍕 Don't @ me.
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
                I'm at that stage where possibilities feel endless but nothing's guaranteed. Building skills, shipping projects, 
                learning constantly, looking for the right opportunity to make an impact.
              </p>
              <p>
                Not gonna pretend I have it all figured out. Still learning. Still growing. Still making mistakes and learning from them.
              </p>
              <p className="text-text text-xl font-medium">
                But that's the fun part, right? This journey of continuous learning, building, breaking, and improving. 
                That's what it's all about.
              </p>
            </div>
          </div>
        </div>
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
      className="p-8 space-y-6 w-full max-w-4xl mx-auto"
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
