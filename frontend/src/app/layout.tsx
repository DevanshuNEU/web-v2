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
  description: 'AI engineer building dev tools at the MCP (Model Context Protocol) layer. Creator of OpenCodeIntel, a production MCP server with hybrid AST + BM25 + Cohere RAG retrieval, and Saar. MS, Northeastern. Boston.',
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
    'founding engineer',
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
    description: 'AI engineer building dev tools at the MCP layer. Creator of OpenCodeIntel (a production MCP server with hybrid AST + BM25 + Cohere RAG retrieval) and Saar.',
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
    description: 'AI engineer building dev tools at the MCP layer. Creator of OpenCodeIntel (MCP server with hybrid RAG retrieval) and Saar.',
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
        'AI engineer building dev tools at the MCP (Model Context Protocol) layer. Creator of OpenCodeIntel, a production MCP server with hybrid AST + BM25 + Cohere RAG retrieval, and Saar.',
      knowsAbout: [
        'Model Context Protocol (MCP)',
        'Retrieval-Augmented Generation (RAG)',
        'AI dev tools',
        'MCP servers',
        'Code intelligence',
        'Hybrid retrieval (AST, BM25, reranking)',
        'AI agents',
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
        'A production MCP server that gives coding agents real code intelligence through hybrid retrieval over a repository: AST structure, BM25 keyword search, and Cohere reranking (RAG).',
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
        'A Chrome extension on the Web Store that intercepts Claude.ai streams to coach against context rot.',
      author: { '@id': PERSON_ID },
      keywords: 'Claude.ai, context engineering, LLM tooling, AI dev tools',
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
            source of truth — keep it accurate and on-message. */}
        <div className="sr-only">
          <h1>Devanshu Chicholikar — AI Engineer (MCP &amp; RAG dev tools)</h1>
          <p>
            I build AI dev tools at the MCP (Model Context Protocol) layer. I created
            OpenCodeIntel, a production MCP server that gives coding agents real code
            intelligence through hybrid retrieval (RAG) over a repository: AST structure,
            BM25 keyword search, and Cohere reranking. I also built Saar, a Chrome
            extension on the Web Store that intercepts Claude.ai streams to coach against
            context rot. MS in Software Engineering Systems from Northeastern University
            (May 2026). Based in Boston, MA. Open to founding-engineer and AI-engineer
            roles at AI and dev-tools startups.
          </p>
          <h2>Projects</h2>
          <ul>
            <li>OpenCodeIntel — production MCP server with hybrid AST + BM25 + Cohere RAG retrieval for code intelligence</li>
            <li>Saar — Chrome extension that intercepts Claude.ai streams for context-rot coaching</li>
            <li>devOS — this interactive desktop-style portfolio, built with Next.js 15 and React 19</li>
          </ul>
          <h2>Expertise</h2>
          <p>
            Model Context Protocol (MCP), Retrieval-Augmented Generation (RAG), AI agents,
            LLM tooling, hybrid retrieval, semantic search, code intelligence, TypeScript,
            Python, Node.js, AWS.
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
