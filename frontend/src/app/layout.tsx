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
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL('https://devanshuchicholikar.com'),
  title: {
    default: 'Devanshu Chicholikar | Software Engineer',
    template: '%s | Devanshu Chicholikar'
  },
  description: 'Software Engineer specializing in full-stack development, distributed systems, and cloud infrastructure. MS Software Engineering @ Northeastern University. Building with React, TypeScript, AWS, Node.js.',
  keywords: [
    'Devanshu Chicholikar',
    'Software Engineer',
    'Full Stack Developer',
    'React Developer',
    'AWS Developer',
    'Northeastern University',
    'TypeScript',
    'Node.js',
    'Boston Software Engineer'
  ],
  authors: [{ name: 'Devanshu Chicholikar' }],
  creator: 'Devanshu Chicholikar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://devanshuchicholikar.com',
    title: 'Devanshu Chicholikar | Software Engineer',
    description: 'Software Engineer specializing in full-stack development, distributed systems, and cloud infrastructure.',
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
    title: 'Devanshu Chicholikar | Software Engineer',
    description: 'Software Engineer specializing in full-stack development and cloud infrastructure',
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

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Devanshu Chicholikar',
  jobTitle: 'Software Engineer',
  url: 'https://devanshuchicholikar.com',
  image: 'https://devanshuchicholikar.com/devanshu-photo.png',
  sameAs: [
    'https://www.linkedin.com/in/devanshuchicholikar/',
    'https://github.com/DevanshuNEU',
    'https://github.com/OpenCodeIntel',
  ],
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'Northeastern University',
  },
  description:
    'Software Engineer specializing in full-stack development, distributed systems, and cloud infrastructure',
  knowsAbout: [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS',
    'Cloud Computing', 'Distributed Systems', 'Python', 'Docker', 'Terraform',
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
        <meta name="google-site-verification" content="EDjK9mEz6aRzLlHgen2Mr76WGHxL5iKMqypx_4oR-iM" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PostHogProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </PostHogProvider>

        {/* Hidden semantic content for crawlers */}
        <div className="sr-only">
          <h1>Devanshu Chicholikar - Software Engineer</h1>
          <p>
            MS Software Engineering student at Northeastern University,
            specializing in full-stack development with React, TypeScript,
            Node.js, and AWS. Building scalable distributed systems and
            cloud infrastructure.
          </p>
          <h2>Projects</h2>
          <ul>
            <li>devOS - Interactive desktop-style portfolio with Next.js 15</li>
            <li>OpenCodeIntel - Code intelligence platform</li>
            <li>Financial Copilot - AI financial intelligence platform</li>
            <li>SecureScale - Production AWS infrastructure with Terraform</li>
            <li>Saar - Auto-generate CLAUDE.md from static analysis</li>
          </ul>
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
