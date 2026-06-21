import React from "react";
import { Hairline } from "@/components/editorial";
import {
  lookingFor, currentlyMastering, readingList, lifeItems, portfolioTechStack,
} from "@/data/aboutMe";

/**
 * CurrentlySection - list-shaped editorial column.
 *
 * Lists render as mono bullets / hairline-divided rows. Tech stack becomes an
 * inline mono run separated by middots. No glass cards, no colored pills, no
 * icon medallions, no graduation/student framing. lifeItems iconNames are
 * intentionally not rendered as medallions (kept in data for other surfaces).
 */

function Bulleted({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-lg text-text-secondary leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="text-text-secondary">&middot;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CurrentlySection() {
  return (
    <div className="flex flex-col gap-10 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        What I&apos;m working on, learning, and dealing with day-to-day.
      </p>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          The work I want next
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Founding-engineer and AI-engineer roles at AI and dev-tools startups. Not
          just sending resumes everywhere. I want teams where I can actually
          contribute, where my input matters, where I can take charge of meaningful
          work and make an impact.
        </p>
        <p className="font-mono-meta">What I&apos;m looking for</p>
        <Bulleted items={lookingFor} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Teaching
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          TA&apos;d Network Structures &amp; Cloud Computing (CSYE6225). Graded
          assignments, held office hours, helped 60+ grad students debug their AWS
          infrastructure at 11 PM, explained why their database queries were slow,
          reviewed code, answered endless questions.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          It was exhausting and energizing at the same time. Their questions forced me
          to rethink things I thought I understood. Teaching really does make you learn
          things at a deeper level.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          What I&apos;m shipping
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Most of my energy goes into building at the MCP layer right now.{" "}
          <span className="text-text">OpenCodeIntel</span> is a production MCP server
          that gives coding agents real code intelligence through hybrid AST + BM25 +
          Cohere retrieval.{" "}
          <span className="text-text">Saar</span> is a Chrome extension on the Web
          Store that reads Claude.ai streams to catch context rot.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Both come from the same itch: making LLMs genuinely useful for the work
          developers actually do, not just demos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Building Portfolio OS
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          You&apos;re literally inside it right now. Started as a weekend project,
          turned into an ongoing experiment.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Before this, I had a Three.js portfolio that felt childish. I wanted
          something different. Something uniquely mine. A space where I could express
          myself without worrying about what people think.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Saw PostHog&apos;s OS-style website on Hacker News. That&apos;s it. Their
          whole vibe, the transparency, the writing, the culture, has been incredibly
          inspiring.
        </p>
        <p className="font-mono-meta">Built with</p>
        <p className="leading-relaxed">
          {portfolioTechStack.map((tech, i) => (
            <React.Fragment key={tech}>
              {i > 0 && <span aria-hidden className="mx-2 text-text-secondary">&middot;</span>}
              <span className="font-mono text-sm text-text">{tech}</span>
            </React.Fragment>
          ))}
        </p>
      </section>

      <Hairline />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="font-mono-meta">Currently mastering</p>
          <div className="flex flex-col">
            {currentlyMastering.map((item, i) => (
              <div key={item.name} className="flex flex-col">
                <div className="flex flex-col gap-1 py-3">
                  <span className="font-display text-text text-xl">{item.name}</span>
                  <span className="text-text-secondary leading-relaxed">{item.detail}</span>
                </div>
                {i < currentlyMastering.length - 1 && <Hairline />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <p className="font-mono-meta">On the reading list</p>
          <Bulleted items={readingList} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Life beyond code
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          A full plate is a lot to juggle. The routine I built around it keeps me
          sane. I still make time for:
        </p>
        <div className="flex flex-col">
          {lifeItems.map((item, i) => (
            <div key={item.title} className="flex flex-col">
              <div className="flex flex-col gap-1 py-3">
                <span className="font-display text-text text-xl">{item.title}</span>
                <span className="text-text-secondary leading-relaxed">{item.detail}</span>
              </div>
              {i < lifeItems.length - 1 && <Hairline />}
            </div>
          ))}
        </div>
        <p className="text-text-secondary leading-relaxed mt-2">
          Oh, and I&apos;m team pineapple on pizza. Don&apos;t @ me.
        </p>
      </section>

      <Hairline />

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          The honest truth
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          I&apos;m at that stage where possibilities feel endless but nothing&apos;s
          guaranteed. Building skills, shipping projects, learning constantly, looking
          for the right opportunity to make an impact.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Not gonna pretend I have it all figured out. Still learning. Still growing.
          Still making mistakes and learning from them.
        </p>
        <p className="text-lg text-text leading-relaxed">
          But that&apos;s the fun part, right? This journey of continuous learning,
          building, breaking, and improving. That&apos;s what it&apos;s all about.
        </p>
      </section>
    </div>
  );
}
