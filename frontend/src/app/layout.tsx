import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://devanshuchichilokar.me'),
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
    url: 'https://devanshuchichilokar.me',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PostHogProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
