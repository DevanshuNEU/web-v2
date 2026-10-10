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
      <JsonLd data={graph(websiteNode(), profilePageNode('/'))} />
      <DesktopHome />
      <HomeSummary />
    </>
  );
}
