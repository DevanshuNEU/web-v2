import type { Metadata } from 'next';
import DesktopHome from '@/components/os/DesktopHome';
import HomeSummary from '@/components/seo/HomeSummary';
import JsonLd from '@/components/seo/JsonLd';
import { graph, websiteNode, profilePageNode } from '@/lib/structuredData';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      {/* Server-rendered marker: globals.css locks body scrolling only when it
          is present, so the OS fills the screen and plain routes scroll. */}
      <div data-os-root hidden />
      <JsonLd data={graph(websiteNode(), profilePageNode('/'))} />
      <DesktopHome />
      <HomeSummary />
    </>
  );
}
