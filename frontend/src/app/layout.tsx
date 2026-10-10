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
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Devanshu Chicholikar | Software Engineer, AI Engineer',
    template: '%s | Devanshu Chicholikar'
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Devanshu Chicholikar',
    'MCP',
    'Model Context Protocol',
    'RAG',
    'Retrieval-Augmented Generation',
    'Software Engineer',
    'AI Engineer',
    'Full-Stack Engineer',
    'Backend Engineer',
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
    'Boston Software Engineer',
    'Boston AI Engineer',
    'Northeastern University'
  ],
  authors: [{ name: 'Devanshu Chicholikar' }],
  creator: 'Devanshu Chicholikar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Devanshu Chicholikar | Software Engineer, AI Engineer',
    description: 'Software and AI engineer who ships AI to production: MCP servers, RAG, evals and voice agents. Built OpenCodeIntel (code search for AI coding agents) and Overhear (QA for voice agents).',
    siteName: 'Devanshu Chicholikar',
    // Images come from the opengraph-image.tsx file next to each route.
  },
  // Title, description and image fall back to the per-page Open Graph tags.
  twitter: {
    card: 'summary_large_image',
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}>
        <PostHogProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </PostHogProvider>

        <Analytics />
      </body>
    </html>
  );
}
