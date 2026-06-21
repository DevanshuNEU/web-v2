import React from "react";
import { Hairline } from "@/components/editorial";

/**
 * JourneySection - narrative, typeset as a plain editorial column.
 *
 * No glass cards, no colored pills, no icon medallions, no hover:scale. Pull
 * quotes become a left Hairline + italic serif. Lists become mono bullets.
 * Prose is preserved verbatim from the prior build (copy is a separate pass).
 */

function PullQuote({ children, cite }: { children: React.ReactNode; cite?: string }) {
  return (
    <div className="flex gap-5 my-2">
      <Hairline orientation="vertical" />
      <div className="flex flex-col gap-2">
        <p className="font-display text-text text-[clamp(1.25rem,3.4cqi,1.75rem)] leading-snug italic">
          {children}
        </p>
        {cite && <p className="font-mono-meta">{cite}</p>}
      </div>
    </div>
  );
}

export function JourneySection() {
  return (
    <div className="flex flex-col gap-10 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        I was 8 when dad brought home our first laptop. Obviously, I went straight
        for the games. But something else caught my attention too.
      </p>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Google. Just... Google.
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          This thing had answers to{" "}
          <em className="emphasis-underline not-italic text-text">literally everything</em>.
          You could type any question and get an answer. You could download games
          online and play them on your computer.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          That&apos;s when it hit me: computers weren&apos;t just for playing games.
          They were something way bigger.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-mono-meta">~2005</p>
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          My friend Rohan had internet
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          His mom would definitely scold us if she caught us gaming, so we&apos;d
          wait until she wasn&apos;t around. The thrill of sneaking those sessions?
          That made it even better.
        </p>
        <PullQuote>
          &ldquo;CoolROMs, GBA emulator, Vice City, Prince of Persia, Aladdin: every
          game was a new world to explore.&rdquo;
        </PullQuote>
        <p className="text-lg text-text-secondary leading-relaxed">
          Every discovery made me want to dig deeper. What else could these machines do?
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Every Friday: Digit magazine day
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          A new Digit magazine would show up with a CD full of software and games.
          Weekends became my exploration time.
        </p>
        <p className="font-mono-meta">My weekend routine</p>
        <ul className="flex flex-col gap-2 text-lg text-text-secondary leading-relaxed">
          <li className="flex gap-3"><span aria-hidden className="text-text-secondary">&middot;</span><span>Install every single thing on that CD, see what works</span></li>
          <li className="flex gap-3"><span aria-hidden className="text-text-secondary">&middot;</span><span>Share CDs with friends (before cloud storage was even a thing)</span></li>
          <li className="flex gap-3"><span aria-hidden className="text-text-secondary">&middot;</span><span>Break things, fix them, learn something new</span></li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Then I discovered Microsoft Encarta
        </h3>
        <p className="text-lg text-text leading-relaxed">This changed everything.</p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Hours would just disappear. Science, history, world wars, mythology,
          animal facts: I&apos;d just click through topic after topic. Learning became
          addictive in the best way possible.
        </p>
        <div className="flex flex-col gap-1 mt-2">
          <p className="font-display text-text text-xl">Delux Paint</p>
          <p className="text-text-secondary leading-relaxed">
            I&apos;d make these digital paintings and show them to my grandfather. The
            way his face would light up? That made every creation worth it.
          </p>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <p className="font-display text-text text-xl">Android Ice Cream Sandwich</p>
          <p className="text-text-secondary leading-relaxed">
            Dad&apos;s Garmin touchscreen phone. First time using Android. That
            touchscreen interface? I was hooked from day one.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-mono-meta">The moment it clicked</p>
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          10th standard.{" "}
          <code className="font-mono text-[0.7em] text-text-secondary">printf(&quot;Hello World&quot;)</code>
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          My first C program. I remember thinking it was the coolest thing ever.
          Then I discovered for loops and started making all these different
          patterns. The possibilities felt endless.
        </p>
        <PullQuote>That&apos;s when I knew: I wanted to be a software engineer.</PullQuote>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          My first &quot;real&quot; project took 2 months
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Database management system for a library. Simple concept, right? Wrong. So
          many errors. OOP concepts I didn&apos;t really understand yet. Failed
          attempts everywhere.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Honestly, I was disappointed at first. But I kept at it.{" "}
          <span className="text-text">Slowly, slowly</span>, things started working.
          Bugs got fixed. Logic made sense.
        </p>
        <p className="text-text-secondary leading-relaxed">
          <span className="text-text">Biggest lesson?</span> Stay calm. Most errors
          are just silly mistakes. Patience wins over frustration every single time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          React confused the hell out of me
        </h3>
        <PullQuote cite="Me, for like 3 months straight">
          &ldquo;Why React when we literally have HTML, CSS, and JavaScript?&rdquo;
        </PullQuote>
        <p className="text-lg text-text-secondary leading-relaxed">
          Getting comfortable with promises, understanding why React even existed,
          figuring out the difference between all these frameworks: steep learning
          curve doesn&apos;t even cover it.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          But when it finally clicked?{" "}
          <span className="text-text">Everything changed</span>. Building complex UIs
          suddenly made sense. Components made sense. The whole ecosystem clicked
          into place.
        </p>
        <p className="text-text-secondary leading-relaxed">
          <span className="text-text">I started noticing a pattern:</span> the
          confusion is always part of learning. You push through it, things click,
          and suddenly you&apos;ve unlocked a whole new set of capabilities.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Then came internships
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Turns out software engineering isn&apos;t just writing code. It&apos;s
          understanding what problem you&apos;re actually solving. Communicating with
          teams. Making trade-offs. Sometimes choosing{" "}
          <span className="text-text">&quot;good enough&quot;</span> over{" "}
          <span className="text-text">&quot;perfect&quot;</span> because shipping matters.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Working on real systems: optimizing APIs for actual users, building
          infrastructure that needs to stay up, solving problems that impact real
          people&apos;s work.
        </p>
        <p className="text-lg text-text leading-relaxed">
          That&apos;s what I&apos;m here for. That&apos;s what gets me excited.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-mono-meta">Teaching</p>
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Being a TA
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          TA&apos;d Network Structures &amp; Cloud Computing and databases. It was
          humbling. Try explaining why someone&apos;s AWS infrastructure isn&apos;t
          working at 11 PM. Nothing tests whether you actually understand something
          like teaching it.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Exhausting sometimes. Grading assignments, holding office hours, debugging
          students&apos; code. But when someone was stuck for hours and I helped them
          figure it out, when they actually got it and their code finally worked?
          That feeling was different. Worth it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-mono-meta">Now</p>
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Building at the MCP layer
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Somewhere along the way, the thing that grabbed me as an 8-year-old came
          back around. These days I build the workflow layer between LLMs and the
          real work developers do.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          <span className="text-text">OpenCodeIntel</span> is a production MCP server
          that gives coding agents real code intelligence: hybrid retrieval over your
          repo with AST structure, BM25 keywords, and Cohere reranking, so the agent
          stops guessing about your codebase.{" "}
          <span className="text-text">Saar</span> is a Chrome extension on the Web
          Store that reads Claude.ai streams to catch context rot before it wrecks an
          answer.
        </p>
        <p className="text-lg text-text leading-relaxed">
          Same kid, same curiosity. Just pointed at the most interesting layer
          I&apos;ve found yet.
        </p>
      </section>
    </div>
  );
}
