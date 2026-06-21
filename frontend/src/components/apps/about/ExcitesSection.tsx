import React from "react";
import { Hairline } from "@/components/editorial";

/**
 * ExcitesSection - narrative, typeset as a plain editorial column.
 *
 * Same language as JourneySection: no glass cards, no colored pills, no icon
 * medallions. Tech runs become inline mono separated by middots. Prose is
 * preserved verbatim (copy is a separate human pass).
 */

export function ExcitesSection() {
  return (
    <div className="flex flex-col gap-10 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        Beyond the resume points and buzzwords, here&apos;s what actually keeps me
        up at night (in a good way).
      </p>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Making LLMs actually useful for developers
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          The thing I can&apos;t stop thinking about is the workflow layer between
          LLMs and the real work developers do. The models are incredible, but they
          fly blind about your codebase, your context, your intent. Closing that gap
          is the most interesting problem I&apos;ve found.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          That&apos;s what OpenCodeIntel is: a production MCP server that gives coding
          agents real code intelligence instead of letting them guess. Building at the
          MCP layer isn&apos;t just calling a model. It&apos;s designing how it thinks
          about a problem, and it has to be{" "}
          <em className="emphasis-underline not-italic text-text">reliable</em> in
          production, not just a demo.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Retrieval that actually works
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Most RAG is one embedding model and a prayer. I care about the version that
          holds up: hybrid retrieval that combines AST structure, BM25 keyword search,
          and reranking, so what comes back is the right context, not the
          closest-vector vibe.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Get retrieval right and the agent stops hallucinating about your code. Get
          it wrong and no amount of prompt engineering saves you. That&apos;s the part
          that hooks me.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          System design obsession
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          While everyone&apos;s focused on implementation details, I love zooming out.
          How do services talk to each other? Where are the bottlenecks? How does this
          scale to a million users? What happens when things fail?
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          System design isn&apos;t just interview prep. It&apos;s how you build things
          that work in production. That high-level thinking, solving complex problems
          with elegant solutions:{" "}
          <span className="text-text">that&apos;s the fun part</span>.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          The learning never stops
        </h3>
        <div className="flex flex-col gap-1">
          <p className="font-display text-text text-xl">Claude &amp; AI-assisted development</p>
          <p className="text-text-secondary leading-relaxed">
            Working with Claude and integrating MCPs has completely changed my
            workflow. It&apos;s not just code generation: it&apos;s having a thinking
            partner. Reviewing code, explaining concepts, helping debug. I&apos;m
            learning faster than ever.
          </p>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <p className="font-display text-text text-xl">Always building</p>
          <p className="text-text-secondary leading-relaxed">
            I&apos;m never off code. There&apos;s always a project, a new concept to
            explore, something to build. Like this Portfolio OS: built it to
            experiment with desktop interactions in the browser and create something
            uniquely mine.
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <p className="font-mono-meta">Currently learning</p>
          <p className="text-text-secondary leading-relaxed">
            <span className="font-mono text-sm text-text">Go / Golang</span>
            <span aria-hidden className="mx-2 text-text-secondary">&middot;</span>
            <span className="font-mono text-sm text-text">Advanced K8s</span>
            <span aria-hidden className="mx-2 text-text-secondary">&middot;</span>
            <span className="font-mono text-sm text-text">System Design</span>
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Technology that actually matters
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Here&apos;s what really drives me: building things that solve real problems.
          Not tech for tech&apos;s sake.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Whether it&apos;s optimizing an API so users don&apos;t wait, building
          infrastructure that doesn&apos;t crash at 3 AM, or creating interfaces people
          can actually use: it&apos;s all about impact.
        </p>
        <p className="text-lg text-text leading-relaxed">
          Technology that makes someone&apos;s life easier, businesses more efficient,
          or impossible things possible. That&apos;s what I&apos;m here for.
        </p>
      </section>

      <Hairline />

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text text-[clamp(1.5rem,4cqi,2rem)]">
          Speaking of things that inspire me
        </h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          PostHog&apos;s entire approach: their writing, their culture, their
          transparency. The way they build in public, share knowledge openly, and
          maintain that balance between fun and focused? That&apos;s the kind of
          environment I want to be part of.
        </p>
        <p className="text-lg text-text-secondary leading-relaxed">
          Their website redesign (the OS-style one) literally inspired this portfolio
          you&apos;re looking at right now. Would genuinely love to work with teams
          like that.
        </p>
      </section>
    </div>
  );
}
