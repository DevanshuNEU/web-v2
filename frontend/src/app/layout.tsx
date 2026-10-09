/**
 * Root Layout
 * 
 * App-wide providers and configuration:
 * - PostHog analytics
 * - Vercel analytics
 * - Theme provider
 * - Toast notifications
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display face for headings/hero (opt-in via the .font-display
// utility). Newsreader is a real multi-weight serif: default heads paint at
// 400-500, with 600 reserved for restrained emphasis. Italic carries the
// editorial accent. Bound to --font-serif so it drives every .font-display
// / .editorial-* site across the OS.
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://devanshuchicholikar.com'),
  title: {
    default: 'Devanshu Chicholikar | AI Engineer, MCP & RAG Dev Tools',
    template: '%s | Devanshu Chicholikar'
  },
  description: 'AI engineer in Boston who ships AI to production end to end: MCP servers, RAG, LLM-as-a-judge evals and voice agents. Built OpenCodeIntel, a code-search platform for AI coding agents, and Overhear, a QA analyst for voice agents.',
  keywords: [
    'Devanshu Chicholikar',
    'MCP',
    'Model Context Protocol',
    'RAG',
    'Retrieval-Augmented Generation',
    'AI Engineer',
    'AI dev tools',
    'MCP server',
    'code intelligence',
    'hybrid retrieval',
    'OpenCodeIntel',
    'Saar',
    'LLM tooling',
    'AI agents',
    'Forward Deployed Engineer',
    'LLM-as-a-judge',
    'LLM evals',
    'voice agents',
    'Overhear',
    'Boston AI Engineer',
    'Northeastern University'
  ],
  authors: [{ name: 'Devanshu Chicholikar' }],
  creator: 'Devanshu Chicholikar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://devanshuchicholikar.com',
    title: 'Devanshu Chicholikar | AI Engineer, MCP & RAG Dev Tools',
    description: 'AI engineer who ships AI to production: MCP servers, RAG, evals and voice agents. Built OpenCodeIntel (code search for AI coding agents) and Overhear (QA for voice agents).',
    siteName: 'Devanshu Chicholikar Portfolio',
    images: [{
      url: '/devanshu-photo.png',
      width: 1200,
      height: 630,
      alt: 'Devanshu Chicholikar'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devanshu Chicholikar | AI Engineer, MCP & RAG Dev Tools',
    description: 'AI engineer: MCP servers, RAG, evals and voice agents. Built OpenCodeIntel and Overhear.',
    images: ['/devanshu-photo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// JSON-LD structured data for SEO. A @graph links the Person to the products
// they built, and knowsAbout enumerates the exact topics search engines and
// AI search should associate with Devanshu (MCP, RAG, code intelligence).
const PERSON_ID = 'https://devanshuchicholikar.com/#devanshu';
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Devanshu Chicholikar',
      jobTitle: 'AI Engineer',
      url: 'https://devanshuchicholikar.com',
      image: 'https://devanshuchicholikar.com/devanshu-photo.png',
      sameAs: [
        'https://www.linkedin.com/in/devanshuchicholikar/',
        'https://github.com/DevanshuNEU',
        'https://github.com/OpenCodeIntel',
        'https://opencodeintel.com',
        'https://getsaar.com',
      ],
      alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: 'Northeastern University',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Boston',
        addressRegion: 'MA',
        addressCountry: 'US',
      },
      description:
        'AI engineer in Boston who ships AI to production end to end: MCP servers, RAG, LLM-as-a-judge evals and voice agents. Built OpenCodeIntel, a code-search platform for AI coding agents, and Overhear, a QA analyst for voice agents.',
      knowsAbout: [
        'Model Context Protocol (MCP)',
        'Retrieval-Augmented Generation (RAG)',
        'AI dev tools',
        'MCP servers',
        'Code intelligence',
        'Hybrid retrieval (AST, BM25, reranking)',
        'AI agents',
        'LLM evaluation (LLM-as-a-judge, golden datasets)',
        'Voice agents',
        'LLM tooling',
        'Semantic search',
        'TypeScript',
        'Python',
        'Node.js',
        'AWS',
        'Distributed systems',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'OpenCodeIntel',
      url: 'https://opencodeintel.com',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      description:
        'A code-search platform for AI coding agents: a web app, a REST API and a 12-tool MCP server over hybrid BM25 + vector retrieval with reranking (RAG).',
      author: { '@id': PERSON_ID },
      keywords: 'MCP, Model Context Protocol, RAG, code intelligence, hybrid retrieval, AI agents',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Saar',
      url: 'https://getsaar.com',
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome',
      description:
        'A Chrome extension on the Chrome Web Store that tracks Claude.ai token usage and cost in real time, entirely in the browser.',
      author: { '@id': PERSON_ID },
      keywords: 'Claude.ai, token usage, LLM cost, Chrome extension, AI dev tools',
    },
    {
      '@type': 'SoftwareSourceCode',
      name: 'Overhear',
      codeRepository: 'https://github.com/DevanshuNEU/overhear',
      programmingLanguage: 'TypeScript',
      description:
        'A QA analyst for voice agents: grades every call a Retell scheduling agent takes against the clinic database, with code deciding the facts and an LLM-as-a-judge scoring tone and safety, evaluated on a 39-call golden dataset.',
      author: { '@id': PERSON_ID },
      keywords: 'voice agents, LLM-as-a-judge, LLM evals, golden dataset, Retell',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="F3zO-86yLvebJBNNSRX5vrSEOmQrQVsvZ3Dx5NEJXkI" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}>
        <PostHogProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </PostHogProvider>

        {/* Server-rendered semantic content for crawlers and AI search. The
            visible app is a client-rendered SPA, so this block is the indexable
            source of truth, so keep it accurate and on-message. */}
        <div className="sr-only">
          <h1>Devanshu Chicholikar, AI Engineer (MCP servers, RAG, evals, voice agents)</h1>
          <p>
            I am an AI engineer in Boston. I ship AI systems to production end to end:
            MCP servers, RAG with retrieval evals, LLM-as-a-judge eval harnesses and
            voice agents, plus the full-stack, infra and design work around them. MS in
            Software Engineering Systems from Northeastern University (May 2026). Open
            to AI Engineer and Forward Deployed Engineer roles anywhere in the US.
          </p>
          <h2>Projects</h2>
          <ul>
            <li>OpenCodeIntel: a code-search platform for AI coding agents (web app, REST API and a 12-tool MCP server). Hybrid BM25 + vector retrieval with reranking; 94% Hit@1 on a 665-query research eval across 14 open-source codebases; p50 641ms for a cold production search, 242ms cached.</li>
            <li>Overhear: a QA analyst for voice agents. Code checks every call against the clinic database and an LLM-as-a-judge scores tone and safety; 23 of 23 planted failures caught on a 39-call golden dataset, macro-F1 0.89.</li>
            <li>CallBudget: predicts which pharmacy has a hard-to-find drug and calls the likeliest first through a voice agent; expected calls fell from 4.3 to 2.3 and false &quot;in stock&quot; answers from 10% to 0%. Ships as a FastMCP server.</li>
            <li>Saar: a Chrome extension on the Chrome Web Store that tracks Claude.ai token usage and cost in real time, entirely in the browser.</li>
            <li>saar CLI: a Python CLI on PyPI that writes AGENTS.md, CLAUDE.md and .cursorrules from static analysis of a codebase.</li>
            <li>Portfolio OS: this interactive desktop-style portfolio, built with Next.js 15 and React 19.</li>
            <li>Financial Copilot: an AI expense tracker on React and Supabase Edge Functions.</li>
          </ul>
          <h2>Experience</h2>
          <ul>
            <li>Graduate Teaching Assistant, CSYE 6225 Network Structures and Cloud Computing, Northeastern University, Sep 2025 to May 2026: cloud on AWS for 100+ graduate students across two semesters.</li>
            <li>Software Engineer, Jaksh Enterprise, Aug 2022 to Jul 2024 (full-time): Java / Spring Boot quotation engine for 590+ products; quote-page p95 latency cut 65%.</li>
            <li>Software Development Engineer Intern, Pitney Bowes, Jan 2022 to Jul 2022: REST APIs and Angular workflows for PitneyShipPro.</li>
          </ul>
          <h2>Expertise</h2>
          <p>
            Model Context Protocol (MCP), Retrieval-Augmented Generation (RAG), LLM
            evaluation (LLM-as-a-judge, golden datasets), voice agents, AI agents, hybrid
            retrieval, TypeScript, Python, React, Next.js, FastAPI, AWS, Terraform.
          </p>
          <h2>Contact</h2>
          <p>Email: chicholikar.d@northeastern.edu</p>
          <p>Location: Boston, MA</p>
          <p>GitHub: github.com/DevanshuNEU</p>
          <p>LinkedIn: linkedin.com/in/devanshuchicholikar</p>
        </div>

        <Analytics />
      </body>
    </html>
  );
}
