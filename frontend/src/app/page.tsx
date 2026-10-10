import type { Metadata } from 'next';
import DesktopHome from '@/components/os/DesktopHome';
import HomeSummary from '@/components/seo/HomeSummary';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      <DesktopHome />
      <HomeSummary />
    </>
  );
}
